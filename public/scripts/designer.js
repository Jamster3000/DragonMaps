// Stage and Layer Variables
let stage, layer, gridLayer, gridGroup, gridPattern;
let gridSize = 50;
let gridActive = true;
let gridOffset = { x: 0, y: 0 };
let gridUpdateTimeout;

// Tool State Variables
let currentTool = null;
let isDrawing = false;
let lastLine;
let isPanning = false;
let lastPanPosition = { x: 0, y: 0 };
let isTransform = false;
let currentTransform = null;
let currentTextNode = null;
let originalProperties = {};
let currentSelectedNode = null;

// UI State Variables
let menuNode = document.getElementById('menu');
let activeMenu = null;
let activeMenuItem = -1;
let menuClick = false;
let isShowingContextMenu = false;
let isRightMouseDown = false;
let rightClickStartPos = null;
let rightClickStartTime = null;
let isEditingText = false;
let isSearchBarFocused = false;
let savedCursor;
let dropIndicator;
let selectedImage = null;

// Shortcuts and Overlays
let shortcutsLink = document.getElementById('shortcuts');
let shortcutsOverlay = document.getElementById('shortcuts-overlay');
let closeShortcuts = document.getElementById('close-shortcuts');
let shortcutsTable = document.getElementById('shortcuts-table');

// Action History
let actionHistory = [];
let currentActionIndex = -1;

// Pagination
let currentPage = 1;
const resultsPerPage = 20;

// Platform Detection
const { isMac, isWindows } = detectPlatform();

// Constants
const MOVE_THRESHOLD = 5; // pixels
const CLICK_DURATION_THRESHOLD = 200; // milliseconds

// Transformers and Image Handling
const transformers = [];
let currentTransformer;
let imagePresenceCallback;
let imageNode = null;

let searchData = {};

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('canvas-container');

    // Create a new stage
    stage = new Konva.Stage({
        container: 'canvas-container',
        width: container.offsetWidth,
        height: container.offsetHeight
    });

    // Create and add a grid layer to the canvas
    gridLayer = new Konva.Layer();
    stage.add(gridLayer);

    // Create and add a grid group to the grid layer
    gridGroup = new Konva.Group();
    gridLayer.add(gridGroup);

    // Add layer to the canvas that everything is drawn and placed on
    layer = new Konva.Layer();
    stage.add(layer);

    createGrid(); // Creates the grid on the grid layer
    setupEventListeners(); // Creates and manages event listeners
    setupShortcutKeyHelp(); // Creates the shortcut key help overlay
    shortcut_draggable();
    rightPanel(); // Manages the right panel, toggle, and everything included in the right panel
    popup_draggable(); // Makes the popup tool box draggable
    loadSearch();
    setupDrawingPropertyListeners();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    setInterval(checkImageOnCanvas, 10);

    // Add drag and drop event listeners
    document.addEventListener('dragstart', onDragStart);
    container.addEventListener('dragover', onDragOver);
    container.addEventListener('drop', onDrop);

    // Add event listener for window resize
    window.addEventListener('resize', resizeCanvas);
});

document.addEventListener('click', function (event) {
    const container = stage.container();
    if (!container.contains(event.target)) {
        deselectAllImages();
    }
});

//===========================================
//search bar and search results
//==========================================

const searchBar = document.getElementById('search-bar');
const searchResults = document.getElementById('search-results');
const resultsContainer = document.getElementById('image-grid');

function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
    });
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.capacity) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
}

const searchCache = new LRUCache(800); // Adjust capacity as needed

const memoizedSearch = (query) => {
    if (searchCache.get(query)) {
        return searchCache.get(query);
    }
    const result = search(query);
    searchCache.put(query, result);
    return result;
};

const performSearch = debounce(() => {
    const query = searchBar.value.trim();
    const results = memoizedSearch(query);
    isEditingText = true;

    searchResults.style.display = query === "" ? "none" : "block";
    resultsContainer.innerHTML = ''; // Clear previous results

    if (query !== "") {
        currentPage = 1; // Reset page count for new search
        loadMoreResults(results);

        // Add sentinel for infinite scrolling
        const sentinel = document.createElement('div');
        sentinel.id = 'sentinel';
        resultsContainer.appendChild(sentinel);
        resultsObserver.observe(sentinel);
    }
}, 300);

function loadMoreResults(results) {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const pageResults = results.slice(startIndex, endIndex);

    pageResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');

        const img = document.createElement('img');
        img.className = "image-results";
        img.alt = 'Search result image';
        img.style.border = "1px solid #FF4500";
        img.style.maxWidth = "100px";
        img.style.margin = "5px";
        img.title = 'Drag to place on grid';
        img.draggable = true;

        // Use data-src for lazy loading
        img.dataset.src = result.url;

        // Add a loading placeholder
        img.src = '../assets/images/loading.gif';

        // Add drag start event listener
        img.addEventListener('dragstart', onDragStart);

        resultItem.appendChild(img);
        resultsContainer.appendChild(resultItem);
    });

    currentPage++;
    lazyLoadImages();
}

searchBar.addEventListener('input', performSearch);
function lazyLoadImages() {
    const images = resultsContainer.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => {
                    img.removeAttribute('data-src');
                    img.classList.add('loaded');
                };
                imageObserver.unobserve(img);
            }
        });
    }, { rootMargin: '200px 0px' });

    images.forEach(img => imageObserver.observe(img));
}

// Search on input change
searchBar.addEventListener('input', performSearch);

//Shows the search results when clicking on the search bar assuming there is something that has been searched and not cleared.
searchBar.addEventListener('focus', () => {
    isEditingText = true;
    if (searchBar.value === "") {
        searchResults.style.display = "none";
    } else {
        searchResults.style.display = "block";
    }
    
});

searchBar.addEventListener('blur', () => {
    isSearchBarFocused = false;
});

const resultsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        const query = searchBar.value.trim();
        const results = memoizedSearch(query);
        loadMoreResults(results);
    }
}, { rootMargin: '100px' });

//hides the search result when clicking off it
document.addEventListener('click', (event) => {
    const target = event.target;
    if (!searchBar.contains(target) && !searchResults.contains(target)) {
        searchResults.style.display = "none";
        isEditingText = false;
    }
});

//all the other even listerns for eventListener or stages
function setupEventListeners() {
    const toolbox = document.getElementById('toolbox');
    const newMapOption = document.getElementById('new-map-option');
    const toggleToolboxButton = document.getElementById('toggle-toolbox');
    const undoMenuItem = document.getElementById('undo-menu-item');
    const redoMenuItem = document.getElementById('redo-menu-item');
    const showGridMenuItem = document.getElementById('show-grid-menu-item');

    // Flag to check if a transform is happening
    let isTransform = false;

    // Check if toolbox exists before adding event listeners
    if (toolbox) {
        toolbox.addEventListener('click', function (e) {
            if (isEditingText) {
                return;
            }

            let targetElement = e.target;

            // Ensure the target element is the button
            if (e.target.tagName === 'I') {
                targetElement = e.target.parentElement;
            }

            if (targetElement.tagName === 'BUTTON') {
                const selectedTool = targetElement.getAttribute('data-tool');

                // Deselect the current tool if the same tool is clicked again
                if (selectedTool === currentTool) {
                    targetElement.classList.remove('active');
                    currentTool = null; // Reset the current tool
                    hideToolOptions(); // Hide tool options if needed
                } else {
                    document.querySelectorAll('#toolbox button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    targetElement.classList.add('active');
                    currentTool = selectedTool;
                    showToolOptions(currentTool, targetElement);
                }
                updateCursor();
                updateImagesDraggable(); // Add this line to update image draggability
            }
        });
    }

    // Ensure these elements exist before adding event listeners
    if (newMapOption) {
        newMapOption.addEventListener('click', showNewMapOverlay);
    }

    if (toggleToolboxButton) {
        toggleToolboxButton.addEventListener('click', toggleToolbox);
    }

    if (undoMenuItem) {
        undoMenuItem.addEventListener('click', undo);
    }

    if (redoMenuItem) {
        redoMenuItem.addEventListener('click', redo);
    }

    if (showGridMenuItem) {
        showGridMenuItem.addEventListener('click', toggleGrid);
    }

    // Adding event listeners to the stage
    if (stage) {
        stage.content.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        // Consolidate click event listeners
        stage.on('click', function (event) {
            // Deselect all images if clicking on the canvas background
            if (event.target === stage) {
                deselectAllImages();
                if (currentTransformer && !isTransform) {
                    currentTransformer.nodes([]);
                    layer.draw();
                }
            }

            // Handle clearing transformer only if not transforming
            if (event.target === stage && currentTool === null && !isTransform) {
                if (currentTransform) {
                    currentTransform.destroy();
                    currentTransform = null;
                    resetTextNodeOpacity();
                }
            }

            // Hide context menu on click
            hideContextMenu();

            // Handle clicking on stage to remove transformer
            if (currentTool !== 'draw' && currentTool !== 'erase' && !isTransform) {
                if (currentTransformer) {
                    currentTransformer.nodes([]); // This clears the transformer
                    layer.draw();
                }
            }
        });

        stage.on('contextmenu', function (e) {
            e.evt.preventDefault();
        });

        // Handle mouse events on the stage
        stage.on('mousedown', function (e) {
            isTransform = false; // Reset the transform flag when the mouse is pressed down
            handleMouseDown(e);
        });

        stage.on('mousemove', handleMouseMove);
        stage.on('mouseup', function (e) {
            isTransform = false; // Reset after the mouse is released
            handleMouseUp(e);
        });

        // Handle transformer events to set `isTransform` flag
        stage.on('transformstart', function () {
            isTransform = true; // Set transform flag to true when transform starts
        });

        stage.on('transformend', function () {
            isTransform = false; // Reset transform flag when transform ends
        });

        stage.on('wheel', handleZoom);
    }

    // Handle document-wide click events to hide context menus and search results
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!searchBar.contains(target) && !searchResults.contains(target)) {
            searchResults.style.display = "none";
            isEditingText = false;
        }

        if (activeMenu && !document.getElementById(`${activeMenu}-menu`).contains(target)) {
            toggleMenu(activeMenu);
        }
    });

    // Hide right-click menu
    window.addEventListener('click', () => {
        if (menuNode) {
            menuNode.style.display = 'none';
        }
    });

    // Resize toolbox popup on window resize
    window.addEventListener('resize', positionToolboxPopup);

    // Export functionality
    const exportImageButton = document.getElementById('export-image');
    const exportJsonButton = document.getElementById('export-json');
}

function updateCursor() {
    switch (currentTool) {
        case 'draw':
            stage.container().style.cursor = 'crosshair';
            break;
        case 'erase':
            stage.container().style.cursor = 'crosshair';
            break;
        case 'text':
            stage.container().style.cursor = 'text';
            break;
        case 'shape':
            stage.container().style.cursor = 'crosshair';
            break;
        default:
            stage.container().style.cursor = 'default';
    }
}

//===========================================
//window overlays
//==========================================
function setupShortcutKeyHelp() {
    shortcutsLink.addEventListener('click', showShortcuts);
    closeShortcuts.addEventListener('click', hideShortcuts);
}

function showShortcuts() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcuts = [
        // Tool Selection
        { key: 'D', description: 'Select draw tool' },
        { key: 'E', description: 'Select erase tool' },
        { key: 'S', description: 'Select shape tool' },
        { key: 'T', description: 'Select text tool' },

        // Action Shortcuts
        { key: isMac ? 'ctrl + Z' : 'Ctrl + Z', description: 'Undo' },
        { key: isMac ? 'ctrl + Y' : 'Ctrl + Y', description: 'Redo' },

        // UI and Miscellaneous
        { key: isMac ? 'ctrl + T' : 'Alt + T', description: 'Toggle toolbox' },
        { key: isMac ? 'ctrl + R' : 'Alt + R', description: 'Toggle right panel' },
        { key: isMac ? 'ctrl + G' : 'Alt + G', description: 'Toggle grid' },
        { key: isMac ? 'ctrl + N' : 'Alt + N', description: 'New map' },
        { key: isMac ? 'ctrl + S' : 'Alt + S', description: 'Show shortcuts' },

        // Special Actions
        { key: 'Escape', description: 'Deselect or unfocus' },
        { key: '/ (Forward Slash)', description: 'Focus search bar' }
    ];


    shortcutsTable.innerHTML = shortcuts.map(shortcut => `
            <tr>
                <td><kbd>${shortcut.key}</kbd></td>
                <td>${shortcut.description}</td>
            </tr>
        `).join('');

    shortcutsOverlay.style.display = 'flex';
}

function hideShortcuts() {
    shortcutsOverlay.style.display = 'none';
}


//==================
// asset management on canvas
//==================
//allows images to be dragged and moved about on the canvas

//allows for dropping images
function onDragOver(e) {
    e.preventDefault();
}

//when the image ahs been dropped
function onDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
}

function onDragOver(e) {
    e.preventDefault();
}

// Modify the drop event handler

// Function to deselect all images
function deselectAllImages() {
    layer.getChildren().each(function (node) {
        if (node.hasName('image')) {
            // Ensure that node is still valid before modifying
            if (node.isDestroyed()) {
                console.warn('Attempted to modify a destroyed node.');
                return; // Skip destroyed nodes
            }
            node.stroke(null);
            node.selected = false;
        }
    });
}


function selectImage(image) {
    deselectAllImages();
    image.selected = true;
    selectedImage = image;
    layer.draw();
}

function onDrop(e) {
    e.preventDefault();
    deselectAllImages();


    const elementId = e.dataTransfer.getData('text/plain');
    const draggedElement = document.getElementById(elementId);

    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();

    const dropX = (e.clientX - stageRect.left - stage.x()) / stage.scaleX();
    const dropY = (e.clientY - stageRect.top - stage.y()) / stage.scaleY();

    if (draggedElement && draggedElement.id === 'watermark') {
        const konvaImage = new Konva.Image({
            image: draggedElement,
            draggable: true,
            x: dropX,
            y: dropY,
            id: "konva-watermark",
            offsetX: draggedElement.width / 2,
            offsetY: draggedElement.height / 2,
            width: 150,
            height: 150,
            crossOrigin: 'anonymous'
        });

        layer.add(konvaImage);
        layer.draw();

        recordAction({
            type: 'addImage',
            image: konvaImage
        });

        konvaImage.on('click', function (evt) {
            if (currentTool === 'draw' || currentTool === 'erase') {
                return;
            }

            selectImage(konvaImage);
            updateTransformer(konvaImage);
            evt.cancelBubble = true;
        });

        selectImage(konvaImage);
        updateTransformer(konvaImage);
    } else {
        let imageUrl = isWindows ? e.dataTransfer.getData('text/uri-list') : e.dataTransfer.getData('text/uri-list');
        if (imageUrl.endsWith('.webp')) {
            const pngUrl = imageUrl.replace('.webp', '.png');

            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                const konvaImage = new Konva.Image({
                    image: img,
                    draggable: true,
                    x: dropX,
                    y: dropY,
                    offsetX: img.width / 2,
                    offsetY: img.height / 2,
                });

                layer.add(konvaImage);

                recordAction({
                    type: 'addImage',
                    image: konvaImage
                });

                konvaImage.on('click', function (evt) {
                    if (currentTool === 'draw' || currentTool === 'erase') {
                        return;
                    }

                    selectImage(konvaImage);
                    updateTransformer(konvaImage);
                    evt.cancelBubble = true;
                });

                selectImage(konvaImage);
                updateTransformer(konvaImage);
                stage.batchDraw();
            };

            img.onerror = function (error) {
                console.error('Error loading PNG image:', error);
            };

            img.src = pngUrl;
        } else {
            console.warn('The image URL is not a WebP image.');
        }
    }
}

function updateTransformer(image) {
    if (!currentTransformer) {
        currentTransformer = new Konva.Transformer({
            borderStroke: '#FF4500',
            borderStrokeWidth: 2,
            padding: 10,
            draggable: true,    
            resizeEnabled: true,
            rotateEnabled: true,
            anchorCornerRadius: 50,
            anchorSize: 18,
            shouldOverdrawWholeArea: true,
            rotateAnchorOffset: 60,
            enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
            rotationSnapTolerance: 10,
        });
        layer.add(currentTransformer);
    }

    currentTransformer.nodes([image]);
    layer.batchDraw();
}


//==========================
//Grid and canvas management
//==========================
//creates the grid on start of the page being loaded
function createGrid() {
    if (!gridGroup) {
        gridGroup = new Konva.Group();
        gridLayer.add(gridGroup);
    }
    updateGrid();
}

//Ensures that the user is okay to start a new map environment if there's already something on the map
function showNewMapOverlay() {
    const text = "Are you sure?\nThis will remove everything you've done so far?";

    if (layer.getChildren().length > 0) {
        if (confirm(text) == true) {
            layer.removeChildren();
            actionHistory = [];
            currentActionIndex = -1;
        }
    }
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    stage.width(container.offsetWidth);
    stage.height(container.offsetHeight);
    createGrid(); // Redraw the grid based on the new size
}

//updates the grid when it's being drawn on or otherwise changed
function updateGrid() {
    clearTimeout(gridUpdateTimeout);

    gridUpdateTimeout = setTimeout(() => {
        const stagePos = stage.position();
        const scale = stage.scaleX();
        const viewportWidth = stage.width() / scale;
        const viewportHeight = stage.height() / scale;

        const startX = Math.floor((0 - stagePos.x / scale) / gridSize) * gridSize;
        const endX = Math.ceil((viewportWidth - stagePos.x / scale) / gridSize) * gridSize;
        const startY = Math.floor((0 - stagePos.y / scale) / gridSize) * gridSize;
        const endY = Math.ceil((viewportHeight - stagePos.y / scale) / gridSize) * gridSize;

        gridGroup.destroyChildren();

        const verticalLines = [];
        const horizontalLines = [];

        for (let x = startX; x <= endX; x += gridSize) {
            verticalLines.push(new Konva.Line({
                points: [x, startY, x, endY],
                stroke: '#ddd',
                strokeWidth: 1 / scale,
            }));
        }

        for (let y = startY; y <= endY; y += gridSize) {
            horizontalLines.push(new Konva.Line({
                points: [startX, y, endX, y],
                stroke: '#ddd',
                strokeWidth: 1 / scale,
            }));
        }

        gridGroup.add(...verticalLines, ...horizontalLines);
        gridLayer.batchDraw();
    }, 0);
}


//snap to grid calculation
function snapToGrid(x, y) {
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
    };
}

//updates the canvas for interacting with the canvas environment such as dropping an image or drawing
function updateCanvas() {
    layer.destroyChildren(); // Clear the canvas

    for (let i = 0; i <= currentActionIndex; i++) {
        const action = actionHistory[i];
        switch (action.type) {
            case 'draw':
            case 'erase':
                const line = new Konva.Line({
                    points: action.points,
                    stroke: action.color,
                    strokeWidth: action.size,
                    globalCompositeOperation: action.type === 'erase' ? 'destination-out' : 'source-over',
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                layer.add(line);
                break;
            case 'addText':
            case 'addShape':
            case 'addImage':
                layer.add(action.node);
                break;
        }
    }
    layer.batchDraw();
} function updateCanvas() {
    // Clear existing nodes without destroying them
    layer.removeChildren(); // This only removes nodes from the layer but doesn't destroy them

    // Re-add nodes based on the action history
    for (let i = 0; i <= currentActionIndex; i++) {
        const action = actionHistory[i];
        switch (action.type) {
            case 'draw':
            case 'erase':
                const line = new Konva.Line({
                    points: action.points,
                    stroke: action.color,
                    strokeWidth: action.size,
                    globalCompositeOperation: action.type === 'erase' ? 'destination-out' : 'source-over',
                    lineCap: 'round',
                    lineJoin: 'round'
                });
                layer.add(line);
                break;
            case 'addText':
            case 'addShape':
            case 'addImage':
                // Clone the node to avoid reusing destroyed nodes
                const nodeClone = action.node.clone();
                layer.add(nodeClone);
                break;
        }
    }
    layer.batchDraw();
}


//toggles the grid visibiliy
function toggleGrid() {
    if (gridActive === true) {
        gridLayer.hide();
        gridActive = false;
    } else if (gridActive === false) {
        gridLayer.show();
        gridActive = true;
    }
}


//========================
//menus
//========================
//deals with the right click menu
function toggleMenu(menuName) {
    const menu = document.getElementById(`${menuName}-menu`);
    if (!menu) {
        console.error(`Menu not found: ${menuName}-menu`);
        return;
    }
    const dropdownContent = menu.querySelector('.dropdown-content');
    if (!dropdownContent) {
        console.error(`Dropdown content not found in menu: ${menuName}-menu`);
        return;
    }

    if (activeMenu === menuName) {
        dropdownContent.style.display = 'none';
        activeMenu = null;
        activeMenuItem = -1;
    } else {
        if (activeMenu) {
            const activeDropdown = document.getElementById(`${activeMenu}-menu`).querySelector('.dropdown-content');
            if (activeDropdown) {
                activeDropdown.style.display = 'none';
            }
        }
        dropdownContent.style.display = 'block';
        activeMenu = menuName;
        highlightMenuItem(0);
    }
}

//heighlights an item in the file, view, or edit menu if the user makes the menu appear by using alt+f/e/v
function highlightMenuItem(index) {
    const menuItems = document.querySelectorAll(`#${activeMenu}-menu .dropdown-content a`);
    menuItems.forEach(item => item.classList.remove('highlighted'));

    if (index >= 0 && index < menuItems.length) {
        menuItems[index].classList.add('highlighted');
        activeMenuItem = index;
    }
}

//shows the popup toolbox when a tool is selected
function showToolboxPopup() {
    const popup = document.getElementById('toolbox-popup');
    popup.style.display = 'block';
    positionToolboxPopup();

    document.querySelectorAll('.number-input-wrapper').forEach(wrapper => {
        const input = wrapper.querySelector('input[type="number"]');
        const increaseBtn = wrapper.querySelector('.number-input-control.increase');
        const decreaseBtn = wrapper.querySelector('.number-input-control.decrease');

        increaseBtn.addEventListener('click', () => {
            input.stepUp();
            input.dispatchEvent(new Event('change'));
        });

        decreaseBtn.addEventListener('click', () => {
            input.stepDown();
            input.dispatchEvent(new Event('change'));
        });
    });
}

//deals with positioning the popup toolbox
function positionToolboxPopup() {
    const toolbox = document.getElementById('toolbox');
    const popup = document.getElementById('popup-toolbox');
    const toolboxRect = toolbox.getBoundingClientRect();

    // Increase the offset to move the popup further to the right
    const offset = 30; // Adjust this value as needed
    popup.style.left = `${toolboxRect.right + offset}px`;
    popup.style.top = `${toolboxRect.top}px`;
}

//hides the right click menu
function hideContextMenu() {
    const menuNode = document.getElementById('menu');
    menuNode.style.display = 'none';
    isShowingContextMenu = false;
}

//shows the right click menu
function showContextMenu(e) {
    if (isPanning) {
        return;
    }

    const menuNode = document.getElementById('menu');
    menuNode.innerHTML = ''; // Clear existing menu items

    const menuItems = [
        { label: 'Add Text', action: showAddTextPopup },
        { label: 'Paste', action: paste },
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.label;
        menuItem.className = 'menu-item'; 
        menuItem.addEventListener('click', () => {
            item.action(e);
            hideContextMenu();
        });
        menuNode.appendChild(menuItem);
    });

    menuNode.style.display = 'block';
    menuNode.style.top = `${e.evt.clientY}px`;
    menuNode.style.left = `${e.evt.clientX}px`;

    isShowingContextMenu = true;
}


//============================
//handles
//============================
//handle zoom by mouse wheel scroll
function handleZoom(e) {
    e.evt.preventDefault();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;

    stage.scale({
        x: newScale,
        y: newScale
    });

    const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);

    updateGrid();
    stage.batchDraw();
}

//handles if a key is pressed down
function handleKeyDown(e) {
    if (isEditingText || isSearchBarFocused) {
        // Only handle Escape to exit text editing or search
        if (e.key === 'Escape') {
            if (isEditingText) {
                // Add logic to finish text editing
                isEditingText = false;
            }
            if (isSearchBarFocused) {
                searchBar.blur();
            }
        }
        return;
    }

    if (e.ctrlKey || (isMac && e.altKey)) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                undo();
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
        }
    }
    
    if ((isWindows && e.altKey) || (isMac && e.ctrlKey)) {
        switch (e.key.toLowerCase()) {
            case 'f':
                e.preventDefault();
                toggleMenu('file');
                return;
            case 'e':
                e.preventDefault();
                toggleMenu('edit');
                return;
            case 'v':
                e.preventDefault();
                toggleMenu('view');
                return;
            case 'g':
                e.preventDefault();
                toggleGrid();
                return;
            case 'n':
                e.preventDefault();
                showNewMapOverlay();
                return;
            case 'r':
                e.preventDefault();
                document.getElementById('toggle-right-panel').click();
                return;
            case 't':
                e.preventDefault();
                document.getElementById('toggle-toolbox').click();
                return;
            case 's':
                e.preventDefault();
                if (shortcutsOverlay.style.display === "" || shortcutsOverlay.style.display === "none") {
                    showShortcuts();
                } else if (shortcutsOverlay.style.display === "flex") {
                    hideShortcuts();
                }
                return;
            case 'u':
                e.preventDefault();
                window.open("tutorials.html", '_blank').focus();
                return;
        }
    }

    const textInput = document.getElementById('text-content');
    const editArea = document.getElementById('text-edit');

    var isFocused = (document.activeElement === textInput);
    var isEditing = (document.activeElement === editArea);

    switch (e.key.toLowerCase()) {
        case 'd':
            selectTool('draw');
            break;
        case 'e':
            selectTool('erase');
            break;
        case 't':
            selectTool('text');
            break;
        case 's':
            selectTool('shape');
            break;
        case '/':
            e.preventDefault();
            searchBar.focus();
            isSearchBarFocused = true;
            break;
        case 'escape':
            deselectTool();
            break;
        case 'shift':
            try {
                document.getElementById(`${currentTool}-snap`).checked = true;
                break;
            } catch (TypeError) { }
    }

    if (activeMenu) {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                highlightMenuItem(Math.max(0, activeMenuItem - 1));
                break;
            case 'ArrowDown':
                e.preventDefault();
                highlightMenuItem(Math.min(document.querySelectorAll(`#${activeMenu}-menu .dropdown-content a`).length - 1, activeMenuItem + 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeMenuItem >= 0) {
                    const menuItems = document.querySelectorAll(`#${activeMenu}-menu .dropdown-content a`);
                    if (menuItems[activeMenuItem]) {
                        menuItems[activeMenuItem].click(); // Trigger the click event on the selected item
                    }
                }
                toggleMenu(activeMenu); // Close the menu after selecting an item
                break;
            case 'Escape':
                e.preventDefault();
                toggleMenu(activeMenu); // Close the menu when Escape is pressed
                break;
        }
    }
}

//handles if key pressed up
function handleKeyUp(e) {
    try {
        if (e.key.toLowerCase() === 'shift') {
            document.getElementById(`${currentTool}-snap`).checked = false;
        }
    } catch (TypeError) { }
}

//handles the mouse movement
function handleMouseMove(e) {
    if (isRightMouseDown) {
        const currentPos = stage.getPointerPosition();
        const dx = currentPos.x - rightClickStartPos.x;
        const dy = currentPos.y - rightClickStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
            isPanning = true;
            if (!savedCursor) {
                savedCursor = stage.container().style.cursor;
                stage.container().style.cursor = 'grabbing';
            }
        }
    }

    if (isPanning) {
        const dx = e.evt.movementX;
        const dy = e.evt.movementY;
        stage.position({
            x: stage.x() + dx,
            y: stage.y() + dy
        });
        updateGrid();
        stage.batchDraw();
    } else if (isDrawing) {
        draw(e);
    }
}


//handles when a mouse button lifts up
function handleMouseUp(e) {
    if (e.evt.button === 2) { // Right mouse button
        const clickDuration = Date.now() - rightClickStartTime;
        if (!isPanning && clickDuration < CLICK_DURATION_THRESHOLD) {
            showContextMenu(e);
        } else {
            hideContextMenu();
        }
        if (isPanning && savedCursor) {
            stage.container().style.cursor = savedCursor;
            savedCursor = null;
        }
        isPanning = false;
        isRightMouseDown = false;
        rightClickStartPos = null;
        rightClickStartTime = null;
    } else if (e.evt.button === 0) { // Left mouse button
        stopDrawing();
    }
    updateCursor();
}


//handles when a mouse button is pressed down
function handleMouseDown(e) {
    if (e.evt.button === 2) { // Right mouse button
        hideContextMenu(); // Hide the context menu when starting a new right-click action
        isRightMouseDown = true;
        rightClickStartPos = stage.getPointerPosition();
        rightClickStartTime = Date.now();
        isPanning = false; // Don't start panning immediately
    } else if (e.evt.button === 0) { // Left mouse button
        if (currentTool === 'draw' || currentTool === 'erase') {
            startDrawing(e);
        } else if (currentTool === 'text') {
            addText(e);
        } else if (currentTool === 'shape') {
            addShape(e);
        } else {
            // Allow node selection when no tool is active
            const clickedNode = e.target;
            if (clickedNode instanceof Konva.Node) {
                if (clickedNode.hasName('drawn-node')) {
                    selectNode(clickedNode);
                } else {
                    // Deselect everything if clicking on an empty area or a different type of node
                    deselectAllNodes();
                }
            } else {
                // clicked on empty area - remove selection
                deselectAllNodes();
            }
        }
    }
}



//==============================
//images (not search specifically)
//==============================
function deselectAllImages() {
    try {
        layer.find('Image').forEach(function (node) {
            node.stroke(null); // Remove the selection stroke
            node.selected = false; // Custom property to manage selection state
        });
        layer.draw();
    } catch (TypeError) {}
}

function updateImagesDraggable() {
    layer.find('Image').forEach(image => {
        image.draggable(currentTool !== 'draw' && currentTool !== 'erase');
    });
}

function checkImageOnCanvas() {
    const foundImage = layer.find('#konva-watermark');
    const exportImageButton = document.getElementById('export-image');
    const exportJsonButton = document.getElementById('export-json');

    // Check if elements exist before modifying properties
    if (exportImageButton && exportJsonButton) {
        if (foundImage.length > 0) {
            exportImageButton.disabled = false;
            exportJsonButton.disabled = false;
        } else {
            exportImageButton.disabled = true;
            exportJsonButton.disabled = true;
        }
    } else {
        console.error('Export buttons not found in the DOM');
    }
}

//==============================
//Tools
//==============================
function addText(e) {
    // Prevent creating new text nodes if a transformation is in progress or editing text
    if (isTransform || isEditingText || currentTool !== "text") {
        return;
    }

    // Check if the user is clicking on a text node to edit instead of adding a new one
    const clickedNode = e.target;
    if (clickedNode instanceof Konva.Text) {
        // Highlight the clicked node and dim others
        highlightTextNodeOpacity(clickedNode);
        updateTextProperties(clickedNode);
        isEditingText = true;
        return;
    }

    // Cleanup existing transformer if any
    if (currentTransform) {
        currentTransform.destroy();
        currentTransform = null;
    }

    // Make the current text node non-draggable if it exists
    if (currentTextNode) {
        currentTextNode.draggable(false);
    }

    let pos = getRelativePointerPosition(layer);
    let text = document.getElementById('text-content').value;
    let fontName = document.getElementById('text-font').value;
    let fontSize = parseInt(document.getElementById('text-size').value);
    let color = document.getElementById('text-color').value;
    let initialWidth = parseInt(document.getElementById('text-width').value);

    // Ensure the font is loaded and ready to be used
    document.fonts.load(`${fontSize}px '${fontName}'`).then(() => {
        const textNode = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: text,
            fontSize: fontSize,
            fontFamily: fontName,
            fill: color,
            draggable: true,
            width: initialWidth,
        });

        layer.add(textNode);

        const transformer = new Konva.Transformer({
            nodes: [textNode],
            borderStroke: '#FF4500',
            draggable: true,
            borderStrokeWidth: 2,
            padding: 10,
            resizeEnabled: false, // Disable stretching of text
            rotateEnabled: true,
            anchorCornerRadius: 50,
            anchorSize: 18,
            shouldOverdrawWholeArea: true,
            rotateAnchorOffset: 60,
            rotationSnapTolerance: 10
        });

        layer.add(transformer);
        layer.draw();

        // Update current transformer and text node references
        currentTransform = transformer;
        currentTextNode = textNode;

        // Prevent creating new text nodes while rotating/transforming
        transformer.on('transformstart', () => {
            isTransform = true;
        });

        transformer.on('transformend', () => {
            isTransform = false; // End transformation state
            resetTextNodeOpacity(textNode); // Optionally reset opacity after transformation
        });

        // Safeguard the transformation process
        textNode.on('transform', () => {
            if (!textNode) {
                console.error('Text node not found during transformation.');
                return;
            }
            transformer.nodes([textNode]);
            layer.batchDraw();
        });

        // Click a text node with the text tool to edit its properties
        textNode.on('click', function () {
            
            updateTextProperties(this);
            isEditingText = true;
        });

        // Listen for the width slider and change the text's available width before wrapping
        document.getElementById('text-width').addEventListener('change', (e) => {
            const newWidth = parseInt(e.target.value);
            updateTextWidth(textNode, newWidth);
        });

        // Record the action for undo/redo functionality
        recordAction({
            type: 'addText',
            node: textNode
        });
    }).catch((error) => {
        console.error(`Failed to load font ${fontName}:`, error); // Debugging
    });
} function addText(e) {
    // Prevent creating new text nodes if a transformation is in progress or editing text
    if (isTransform || isEditingText || currentTool !== "text") {
        return;
    }

    // Check if the user is clicking on a text node to edit instead of adding a new one
    const clickedNode = e.target;
    if (clickedNode instanceof Konva.Text) {
        // Highlight the clicked node and dim others
        highlightTextNodeOpacity(clickedNode);
        updateTextProperties(clickedNode);
        isEditingText = true;
        return;
    }

    // Cleanup existing transformer if any
    if (currentTransform) {
        currentTransform.destroy();
        currentTransform = null;
    }

    // Make the current text node non-draggable if it exists
    if (currentTextNode) {
        currentTextNode.draggable(false);
    }

    let pos = getRelativePointerPosition(layer);
    let text = document.getElementById('text-content').value;
    let fontName = document.getElementById('text-font').value;
    let fontSize = parseInt(document.getElementById('text-size').value);
    let color = document.getElementById('text-color').value;
    let initialWidth = parseInt(document.getElementById('text-width').value);

    // Ensure the font is loaded and ready to be used
    document.fonts.load(`${fontSize}px '${fontName}'`).then(() => {
        const textNode = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: text,
            fontSize: fontSize,
            fontFamily: fontName,
            fill: color,
            draggable: true,
            width: initialWidth,
        });

        layer.add(textNode);

        const transformer = new Konva.Transformer({
            nodes: [textNode],
            borderStroke: '#FF4500',
            draggable: true,
            borderStrokeWidth: 2,
            padding: 10,
            resizeEnabled: false, // Disable stretching of text
            rotateEnabled: true,
            anchorCornerRadius: 50,
            anchorSize: 18,
            shouldOverdrawWholeArea: true,
            rotateAnchorOffset: 60,
        });

        layer.add(transformer);
        layer.draw();

        // Update current transformer and text node references
        currentTransform = transformer;
        currentTextNode = textNode;

        // Handle transformation events
        transformer.on('transformstart', () => {
            isTransform = true; // Set flag when transformation starts
        });

        transformer.on('transformend', () => {
            isTransform = false; // Reset flag when transformation ends
            resetTextNodeOpacity(textNode); // Optionally reset opacity after transformation
        });

        // Safeguard the transformation process
        transformer.on('transform', () => {
            if (!textNode) {
                console.error('Text node not found during transformation.');
                return;
            }
            // Ensure the transformer and textNode are valid before proceeding
            if (textNode && transformer) {
                transformer.nodes([textNode]);
                layer.batchDraw();
            } else {
                console.error('Transformer or text node is undefined.');
            }
        });

        // Click a text node with the text tool to edit its properties
        textNode.on('click', function () {
            if (isEditingText || isTransform) return; // Prevent duplicate clicks during editing or transforming

            updateTextProperties(this);
            isEditingText = true;
        });

        // Listen for the width slider and change the text's available width before wrapping
        document.getElementById('text-width').addEventListener('change', (e) => {
            const newWidth = parseInt(e.target.value);
            updateTextWidth(textNode, newWidth);
        });

        // Record the action for undo/redo functionality
        recordAction({
            type: 'addText',
            node: textNode
        });
    }).catch((error) => {
        console.error(`Failed to load font ${fontName}:`, error); // Debugging
    });
}



function resetTextEditing() {
    isEditingText = false;
}

function updateTextWidth(textNode, newWidth) {
    //This function updates the text node's width property
    textNode.width(newWidth);
    textNode.getLayer().batchDraw()
}

function updateTextProperties(textNode) {
    //only funtions whilst the text tool is open, updates the values so they match teh selected text.
    document.getElementById('text-content').value = textNode.text();
    document.getElementById('text-font').value = textNode.fontFamily();
    document.getElementById('text-size').value = textNode.fontSize();
    document.getElementById('text-color').value = textNode.fill();
    document.getElementById('text-width').value = textNode.width();

    //changes the text when the user types
    document.getElementById('text-content').oninput = function () {
        textNode.text(this.value);
        layer.batchDraw();
    };

    //changes the font when the user selects a new font
    document.getElementById('text-font').onchange = function () {
        textNode.fontFamily(this.value);
        layer.batchDraw();
    };

    //changes the font size when the user selects a new font size
    document.getElementById('text-size').onchange = function () {
        textNode.fontSize(parseInt(this.value));
        layer.batchDraw();
    };

    //changes the text color when the user selects a new color
    document.getElementById('text-color').onchange = function () {
        textNode.fill(this.value);
        layer.batchDraw();
    };

    //changes the text width when the user selects a new width
    document.getElementById('text-width').onchange = function () {
        textNode.width(parseInt(this.value));
        layer.batchDraw();
    };

    // Update the current text node reference
    currentTextNode = textNode;

    highlightTextNodeOpacity(textNode);

    // Create or update transformer
    if (currentTransform) {
        currentTransform.destroy();
    }
    currentTransform = new Konva.Transformer({
        nodes: [textNode],
        borderStroke: '#FF4500',
        borderStrokeWidth: 2,
        padding: 10,
        draggable: true,
        resizeEnabled: false,
        rotateEnabled: true,
        anchorCornerRadius: 50,
        anchorSize: 18,
        shouldOverdrawWholeArea: true,
        rotateAnchorOffset: 60,
        rotationSnapTolerance: 10,
    });

    layer.add(currentTransform);
    layer.draw();
}

function highlightTextNodeOpacity(textNode) {
    textNode.opacity(1); // Set full opacity for the selected node
    layer.find('Text').forEach(node => {
        if (node !== textNode) {
            node.opacity(0.5); // Dim all other text nodes
        }
    });
    layer.batchDraw();
}

// Function to reset all text nodes' opacity to full
function resetTextNodeOpacity() {
    layer.find('Text').forEach(node => {
        node.opacity(1); // Reset opacity for all text nodes
    });
    layer.batchDraw();
}

function addShape(e) {
    const startPos = getRelativePointerPosition(layer);
    let shape;
    const shapeType = document.getElementById('shape-type').value;
    const strokeWidth = parseInt(document.getElementById('shape-stroke-width').value);
    const fillColor = document.getElementById('shape-fill').value;
    const strokeColor = document.getElementById('shape-stroke').value;
    const snapToGrid = document.getElementById('shape-snap').checked || e.evt.shiftKey;

    switch (shapeType) {
        case 'Rectangle':
            shape = new Konva.Rect({
                x: startPos.x,
                y: startPos.y,
                width: gridSize,
                height: gridSize,
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                draggable: true,
            });
            break;
        case 'Circle':
            shape = new Konva.Circle({
                x: startPos.x,
                y: startPos.y,
                radius: gridSize / 2,
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                draggable: true,
            });
            break;
        case 'Triangle':
            shape = new Konva.RegularPolygon({
                x: startPos.x,
                y: startPos.y,
                sides: 3,
                radius: gridSize / 2,
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                draggable: true,
            });
            break;
        case 'Pentagon':
            shape = new Konva.RegularPolygon({
                x: startPos.x,
                y: startPos.y,
                sides: 5,
                radius: gridSize / 2,
                fill: fillColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                draggable: true,
            });
            break;
    }

    layer.add(shape);
    layer.draw();

    // Record the action for undo/redo
    recordAction({
        type: 'addShape',
        node: shape,
    });

    // Add event listeners for shape movement and transformation
    shape.on('dragmove', () => {
        layer.batchDraw();
    });
    shape.on('transformer.transform', () => {
        layer.batchDraw();
    });

    // Create the transformer and add it to the layer
    const transformer = new Konva.Transformer({
        node: shape,
        borderStroke: 'blue',
        borderStrokeWidth: 2,
        padding: 10,
        resizeEnabled: true,
        rotateEnabled: true,
        anchorCornerRadius: 50,
        anchorSize: 14,
        shouldOverdrawWholeArea: true,
        rotateAnchorOffset: 60,
        enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
        rotationSnapTolerance: 10,
    });
    layer.add(transformer);

    if (currentTransformer) {
        currentTransformer.nodes([]);
    }
    currentTransformer = transformer;
    currentTransformer.nodes([currentTransformer.getNodes()[0]]);
    layer.batchDraw();
}

function handleShapeResize(e) {
    if (currentTransformer && e.target === currentTransformer.getNodes()[0]) {
        // The user is trying to resize a shape, so we don't want to create a new one
        return;
    } else {
        // The user is not trying to resize a shape, so we can proceed with creating a new one
        addShape(e);
    }
}

function addSquare(e) {
    const startPos = getRelativePointerPosition(layer);
    const shape = new Konva.Rect({
        x: startPos.x,
        y: startPos.y,
        width: gridSize,
        height: gridSize,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        draggable: true,
    });

    layer.add(shape);
    layer.draw();

    // Record the action for undo/redo
    recordAction({
        type: 'addShape',
        node: shape,
    });

    // Add event listeners for shape movement and transformation
    shape.on('dragmove', () => {
        layer.batchDraw();
    });
    shape.on('transformer.transform', () => {
        layer.batchDraw();
    });

    // Create the transformer and add it to the layer
    const transformer = new Konva.Transformer({
        node: shape,
        borderStroke: 'blue',
        borderStrokeWidth: 2,
        padding: 10,
        resizeEnabled: true,
        rotateEnabled: true,
        anchorCornerRadius: 50,
        anchorSize: 14,
        shouldOverdrawWholeArea: true,
        rotateAnchorOffset: 60,
        enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
        rotationSnapTolerance: 10,
    });
    layer.add(transformer);

    if (currentTransformer) {
        currentTransformer.nodes([]);
    }
    currentTransformer = transformer;
    currentTransformer.nodes([currentTransformer.getNodes()[0]]);
    layer.batchDraw();
}

function addSquare(e) {
    addShape(e);
}

function addEllipse(e) {
    addShape(e);
}

function addPentagon(e) {
    addShape(e);
}

//for the drawing tool
function startDrawing(e) {
    isDrawing = true;
    const pos = getRelativePointerPosition(layer);
    const colorInput = document.getElementById('draw-color');
    const sizeInput = document.getElementById('draw-size');
    const color = colorInput ? colorInput.value : 'black';
    const size = sizeInput ? parseInt(sizeInput.value) : 5;
    let snapToGridEnabled = document.getElementById(`${currentTool}-snap`).checked || e.evt.shiftKey;
    let startPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;
    lastLine = new Konva.Line({
        stroke: currentTool === 'draw' ? color : 'white',
        strokeWidth: size,
        globalCompositeOperation: currentTool === 'erase' ? 'destination-out' : 'source-over',
        points: [startPos.x, startPos.y],
        lineCap: 'round',
        lineJoin: 'round',
        name: 'drawn-node'
    });
    layer.add(lastLine);

    // Add click event to the new line
    lastLine.on('click', function () {
        selectNode(this);
    });
}


//also for the drawing tool
function draw(e) {
    if (!isDrawing) return;
    const pos = getRelativePointerPosition(layer);
    let straightLineEnabled = e.evt.altKey;
    let snapToGridEnabled = false;
    const snapElement = document.getElementById(`${currentTool}-snap`);

    if (snapElement) {
        snapToGridEnabled = !straightLineEnabled && (snapElement.checked || e.evt.shiftKey);
    } else {
        return;
    }
    let newPos;
    if (straightLineEnabled) {
        // ... (keep your existing straight line logic)
    } else if (snapToGridEnabled) {
        newPos = snapToGrid(pos.x, pos.y);
    } else {
        newPos = pos;
    }
    let newPoints = lastLine.points().concat([newPos.x, newPos.y]);
    lastLine.points(newPoints);

    // Update the line properties based on current UI values
    lastLine.stroke(document.getElementById('draw-color').value);
    lastLine.strokeWidth(parseInt(document.getElementById('draw-size').value));

    layer.batchDraw();
}

//uh, again when the user stops drawing
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        recordAction({
            type: currentTool,
            points: lastLine.points(),
            color: lastLine.stroke(),
            size: lastLine.strokeWidth()
        });
    }
}

//==============================
//other fuctions and such
//==============================

function paste() {
    console.log("nothing here");
}

function loadSearch() {
    const storageData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        try {
            storageData[key] = JSON.parse(value);
        } catch (e) {
            storageData[key] = value;
        }
    }

    for (let key in storageData) {
        if (storageData.hasOwnProperty(key)) {
            const items = storageData[key];

            // Ensure items is an array before iterating
            if (Array.isArray(items)) {
                for (let item of items) {
                    if (item.url && item.keywords) {
                        if (!searchData[key]) {
                            searchData[key] = {};
                        }
                        searchData[key][item.url] = item.keywords;
                    }
                }
            }
        }
    }
}


function search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (let itemKey in searchData) {
        if (searchData.hasOwnProperty(itemKey)) {
            const itemData = searchData[itemKey];
            for (let url in itemData) {
                if (itemData.hasOwnProperty(url)) {
                    const keywords = itemData[url];
                    if (keywords.some(keyword => {
                        const lowerKeyword = keyword.toLowerCase();
                        return lowerKeyword.includes(lowerQuery) || lowerQuery.includes(lowerKeyword);
                    })) {
                        results.push({ url, keywords });
                    }
                }
            }
        }
    }
    return results;
}

function popup_draggable() {
    const popupToolbox = document.getElementById("popup-toolbox");
    if (popupToolbox) {
        dragElement(popupToolbox);
    }
}

//allowing of dragging elements
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.onmousedown = function (e) {
        // Check if the target is an interactive element
        if (e.target.tagName.toLowerCase() === 'input' ||
            e.target.tagName.toLowerCase() === 'select' ||
            e.target.tagName.toLowerCase() === 'button' ||
            e.target.tagName.toLowerCase() === 'textarea') {
            return; // Don't start dragging
        }
        dragMouseDown(e);
    };

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.e;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

//used for key binds
function selectTool(tool) {
    const toolButton = document.querySelector(`#toolbox button[data-tool="${tool}"]`);

    // If a tool button exists for the provided tool
    if (toolButton) {
        if (currentTool === tool) {
            // If the selected tool is already active, toggle it off (deselect)
            deselectTool();
        } else {
            // If a different tool is selected, switch to the new tool
            if (currentTool) {
                deselectTool();
            }
            currentTool = tool;
            toolButton.classList.add('active'); 
            showToolOptions(tool); 
            updateCursor();
        }
    }
}

function deselectTool() {
    // Deselect the current tool if any tool is active
    if (currentTool) {
        const activeButton = document.querySelector(`#toolbox button[data-tool="${currentTool}"]`);
        if (activeButton) {
            activeButton.classList.remove('active');
        }
        hideToolOptions(); 
        currentTool = null;
        updateCursor(); 
    }
}


//toggles toolbox visibility on click
function toggleToolbox() {
    const toolbox = document.getElementById('toolbox');
    const toggleButton = document.getElementById('toggle-toolbox');
    toolbox.classList.toggle('visible');
    toggleButton.innerHTML = toolbox.classList.contains('visible') ? '&#9658;&#9658;' : '&#9668;&#9668;';
}

//get's the user's mouse pointer position
function getRelativePointerPosition(node) {
    const transform = node.getAbsoluteTransform().copy();
    transform.invert();
    const pos = node.getStage().getPointerPosition();
    return transform.point(pos);
}

//show the tool box popup options, different tools have different options
function showToolOptions(tool, buttonElement) {
    const popupToolbox = document.getElementById('popup-toolbox');
    const toolOptions = document.getElementById('tool-options');
    toolOptions.innerHTML = '';

    const options = getToolOptions(tool);
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('tool-option');

        if (option.type === 'checkbox') {
            optionElement.innerHTML = `
                <label for="${option.id}">
                    <input type="${option.type}" id="${option.id}"> ${option.label}
                </label>
            `;
        } else if (option.type === "breakline") {
            optionElement.innerHTML = `<hr>`;
        } else if (option.type === "number") {
            optionElement.innerHTML = `
                <label for="${option.id}">${option.label}:</label>
                <div class="number-input-wrapper">
                    <input type="number" id="${option.id}" value="${option.value}" min="${option.min}" max="${option.max}">
                    <div class="number-input-controls">
                        <button class="number-input-control increase">+</button>
                        <button class="number-input-control decrease">-</button>
                    </div>
                </div>
            `;
        } else if (option.type === "file") {
            optionElement.innerHTML = `
                <label for="${option.id}">${option.label}:</label>
                <div class="file-input-wrapper">
                    <input type="${option.type}" id="${option.id}" accept="${option.accept}">
                </div>
            `;
        } else if (option.type === 'select') {
            optionElement.innerHTML = `
                <label for="${option.id}">${option.label}:</label>
                <select id="${option.id}">
                    ${option.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
            `;
        } else {
            optionElement.innerHTML = `
                <label for="${option.id}">${option.label}:</label>
                <input placeholder="${option.placeholder || ''}" type="${option.type}" id="${option.id}" value="${option.value}" min="${option.min}" max="${option.max}">
            `;
        }
        toolOptions.appendChild(optionElement);
    });

    popupToolbox.style.display = 'block';
    positionToolboxPopup();

    try {
        document.getElementById('import-font').addEventListener('change', function (event) {
            handleFontImport(event);
        });
    } catch (TypeError) { }

    // Add event listeners for custom number inputs
    document.querySelectorAll('.number-input-wrapper').forEach(wrapper => {
        const input = wrapper.querySelector('input[type="number"]');
        const increaseBtn = wrapper.querySelector('.number-input-control.increase');
        const decreaseBtn = wrapper.querySelector('.number-input-control.decrease');

        increaseBtn.addEventListener('click', () => {
            input.stepUp();
            input.dispatchEvent(new Event('change'));
        });

        decreaseBtn.addEventListener('click', () => {
            input.stepDown();
            input.dispatchEvent(new Event('change'));
        });
    });

    try {
        document.getElementById('import-font-button').addEventListener('click', loadGoogleFont);
    } catch (TypeError) { }

    // Load saved fonts from local storage and update the font selection
    loadSavedFonts();
}

function hideToolOptions() {
    const popupToolbox = document.getElementById('popup-toolbox');
    popupToolbox.style.display = 'none';
}

//get the tool that has what options
function getToolOptions(tool) {
    switch (tool) {
        case 'draw':
            return [{
                id: 'draw-color',
                label: 'Color',
                type: 'color',
                value: '#000000'
            },
            {
                id: 'draw-size',
                label: 'Size',
                type: 'number',
                value: 5
            },
            {
                id: 'draw-snap',
                label: 'Snap to Grid',
                type: 'checkbox'
            }
            ];
        case 'erase':
            return [{
                id: 'erase-size',
                label: 'Size',
                type: 'number',
                value: 20
            },
            {
                id: 'erase-snap',
                label: 'Snap to Grid',
                type: 'checkbox'
            }
            ];
        case 'text':    
            return [
                {
                    id: 'text-content',
                    label: 'Text',
                    type: 'text',
                    value: 'Enter text'
                },
                {
                    id: 'text-font',
                    label: 'Font',
                    type: 'select',
                    options: [
                        'Arial',
                        'Times New Roman',
                        'Courier New',
                        'Garamond',
                        'Comic Sans MS',
                        'Arial Black',
                        'Impact'
                    ]
                },
                {
                    id: 'text-size',
                    label: 'Size',
                    type: 'number',
                    value: 50
                },
                {
                    id: 'text-width',
                    label: 'Width',
                    type: 'range',
                    max: 100000,
                    min: 400,
                    value: 400
                },
                {
                    id: 'text-color',
                    label: 'Color',
                    type: 'color',
                    value: '#ffffff'
                }, 
                {
                    id: 'import-font',
                    label: 'Import Font',
                    type: 'file'
                }
            ];
        case 'shape':
            return [
                {
                    id: 'shape-type',
                    label: 'Shape',
                    type: 'select',
                    options: ['Rectangle', 'Circle', 'Triangle', 'Pentagon']
                },
                {
                    id: 'shape-fill',
                    label: 'Fill Color',
                    type: 'color',
                    value: '#ffffff'
                },
                {
                    id: 'shape-stroke',
                    label: 'Stroke Color',
                    type: 'color',
                    value: '#000000'
                },
                {
                    id: 'shape-stroke-width',
                    label: 'Stroke Width',
                    type: 'number',
                    value: 2
                },
                {
                    id: 'shape-snap',
                    label: 'Snap to Grid',
                    type: 'checkbox'
                }
            ];
        default:
            return [];
    }
}

//undo feature
function undo() {
    if (currentActionIndex >= 0) {
        currentActionIndex--;
        updateCanvas();
    }
}

function redo() {
    if (currentActionIndex < actionHistory.length - 1) {
        currentActionIndex++;
        updateCanvas();
    }
}

function showAddTextPopup(e) {
    const toolButton = document.querySelector(`#toolbox button[data-tool="text"]`);
    toolButton.click();
    pos = getRelativePointerPosition(layer);
}

//recording the user's action which can be used to undo or redo
function recordAction(action) {
    actionHistory = actionHistory.slice(0, currentActionIndex + 1);
    actionHistory.push(action);
    currentActionIndex++;
}

function shortcut_draggable() {
    const shortcut = document.querySelector(".overlay-content");
    if (shortcut) {
        dragElement(shortcut);
    }
}

function rightPanel() {
    const rightPanel = document.getElementById('right-panel');
    const toggleRightPanelButton = document.getElementById('toggle-right-panel');

    if (toggleRightPanelButton) {
        toggleRightPanelButton.addEventListener('click', toggleRightPanel);
    }

    function toggleRightPanel() {
        if (rightPanel) {
            rightPanel.classList.toggle('visible');
            toggleRightPanelButton.classList.toggle('panel-open');

            if (rightPanel.classList.contains('visible')) {
                const watermarkImage = document.getElementById('watermark');
                
                if (watermarkImage) {
                    watermarkImage.className = "image-results";
                    watermarkImage.alt = 'Search result image';
                    watermarkImage.style.border = "1px solid #FF4500";
                    watermarkImage.style.maxWidth = "100px";
                    watermarkImage.style.margin = "5px";
                    watermarkImage.title = 'Drag to place on grid';
                    watermarkImage.draggable = true;
                    watermarkImage.addEventListener('dragstart', onDragStart);
                }
                
                toggleRightPanelButton.innerHTML = '&#9658;&#9658;';
            } else {
                toggleRightPanelButton.innerHTML = '&#9668;&#9668;';
            }
        }
    }

    if (rightPanel) {
        document.querySelectorAll('.section-header, .category-header').forEach(header => {
            header.addEventListener('click', function () {
                this.classList.toggle('active');
                let content = this.nextElementSibling;
                if (content) {
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                    let icon = this.querySelector('.toggle-icon');
                    if (icon) {
                        icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
                    }
                }
            });
        });
    }

    const exportImageButton = document.getElementById('export-image');
    const exportJsonButton = document.getElementById('export-json');

    if (exportImageButton) {
        exportImageButton.addEventListener('click', async function (e) {
            e.preventDefault();

            if (stage) {
                // Create a temporary canvas to capture full content
                const fullCanvas = document.createElement('canvas');
                const fullContext = fullCanvas.getContext('2d');

                // Set dimensions to the full extent of the stage
                const fullWidth = stage.width() * stage.scaleX();
                const fullHeight = stage.height() * stage.scaleY();
                fullCanvas.width = fullWidth;
                fullCanvas.height = fullHeight;

                // Draw the stage content onto the full canvas
                const image = new Image();
                const dataURL = stage.toDataURL({ pixelRatio: stage.scaleX() });

                image.onload = () => {
                    fullContext.drawImage(image, 0, 0);

                    // Draw the grid if it exists
                    if (gridLayer) {
                        const gridDataURL = gridLayer.toDataURL();
                        const gridImage = new Image();

                        gridImage.onload = () => {
                            fullContext.drawImage(gridImage, 0, 0);

                            // Export the full canvas
                            const link = document.createElement('a');
                            link.href = fullCanvas.toDataURL('image/png');
                            link.download = 'full-canvas-image.png'; // Specify the file name

                            // Trigger the download
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        };

                        gridImage.src = gridDataURL;
                    } else {
                        // Export the full canvas
                        const link = document.createElement('a');
                        link.href = fullCanvas.toDataURL('image/png');
                        link.download = 'full-canvas-image.png'; // Specify the file name

                        // Trigger the download
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                };

                image.src = dataURL;
            }
        });
    }


    if (exportJsonButton) {
        exportJsonButton.addEventListener('click', function () {
            console.log('Exporting as JSON...');
        });
    }
}

function handleFontImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const fontName = file.name.split('.')[0]; // Use filename as font name
            const fontFace = new FontFace(fontName, e.target.result);
            fontFace.load().then(function (loadedFace) {
                document.fonts.add(loadedFace);
                addFontToSelection(fontName);

                // Save font to local storage
                saveFont(e.target.result, fontName + ".ttf");

                // Add a style to make the font available
                const style = document.createElement('style');
                style.textContent = `
                    @font-face {
                        font-family: '${fontName}';
                        src: url(${URL.createObjectURL(file)}) format('truetype');
                    }
                `;
                document.head.appendChild(style);
            }).catch(function (error) {
                console.error('Error loading font:', error);
            });
        };
        reader.readAsArrayBuffer(file);
    }
}


function addFontToSelection(fontName) {
    try {
        const fontSelect = document.getElementById('text-font');

        // Check if the font is already in the list
        if (!Array.from(fontSelect.options).some(option => option.value === fontName)) {
            const option = document.createElement('option');
            option.value = fontName;
            option.textContent = fontName;
            fontSelect.appendChild(option);
        }

        // Select the new font
        fontSelect.value = fontName;
    } catch (error) { }
}

function saveFont(data, filename) {
    const fontName = filename.split('.')[0]; // Remove the .ttf extension
    localStorage.setItem(filename, JSON.stringify({
        data: Array.from(new Uint8Array(data)),
        name: fontName
    }));
}

function loadSavedFonts() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.endsWith('.ttf')) {
                const fontData = JSON.parse(localStorage.getItem(key));
                if (fontData && fontData.data && fontData.name) {
                    const fontName = fontData.name.split('.')[0]; //font name without the .ttf at the end
                    const fontDataArray = new Uint8Array(fontData.data); //the font's data
                    const fontBlob = new Blob([fontDataArray], { type: 'font/ttf' }); //create a blob from the font data
                    const fontUrl = URL.createObjectURL(fontBlob); //create a URL for the blob

                    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
                    fontFace.load().then(function (loadedFace) {
                        document.fonts.add(loadedFace);
                        addFontToSelection(fontName);

                        // Add a style to make the font available
                        const style = document.createElement('style');
                        style.textContent = `
                            @font-face {
                                font-family: '${fontName}';
                                src: url(${fontUrl}) format('truetype');
                            }
                        `;
                        document.head.appendChild(style);

                    }).catch(function (error) {
                        console.error('Error loading font:', error);
                    });
                }
            }
        }
    } catch (error) { }
}

//used to select drawing node
function selectNode(node) {
    deselectAllNodes();
    // Store original properties
    originalProperties = {
        stroke: node.stroke(),
        strokeWidth: node.strokeWidth()
    };
    // Highlight the selected node
    node.stroke('#FF4500');
    node.strokeWidth(originalProperties.strokeWidth + 2);
    node.draw();
    // Store the selected node for further actions
    currentSelectedNode = node;
    // Update UI to reflect current properties
    updateDrawingPropertiesUI(node);
}


function deselectAllNodes() {
    const nodes = layer.getChildren();
    nodes.forEach(function (node) {
        if (node.hasName('drawn-node')) {
            // Restore original properties if they exist
            if (node === currentSelectedNode && originalProperties) {
                node.stroke(originalProperties.stroke);
                node.strokeWidth(originalProperties.strokeWidth);
            }
            node.draw();
        }
    });
    currentSelectedNode = null;
    originalProperties = {};
}

function updateDrawingPropertiesUI(node) {
    if (node) {
        const colorInput = document.getElementById('draw-color');
        const sizeInput = document.getElementById('draw-size');
        if (colorInput) colorInput.value = node.stroke();
        if (sizeInput) sizeInput.value = node.strokeWidth();
    }
}

function updateDrawingProperties() {
    if (currentSelectedNode) {
        const colorInput = document.getElementById('draw-color');
        const sizeInput = document.getElementById('draw-size');
        const newColor = colorInput ? colorInput.value : currentSelectedNode.stroke();
        const newSize = sizeInput ? parseInt(sizeInput.value) : currentSelectedNode.strokeWidth();

        currentSelectedNode.stroke(newColor);
        currentSelectedNode.strokeWidth(newSize);

        // Update original properties
        originalProperties.stroke = newColor;
        originalProperties.strokeWidth = newSize;

        layer.batchDraw();
    }
}

function setupDrawingPropertyListeners() {
    const colorInput = document.getElementById('draw-color');
    const sizeInput = document.getElementById('draw-size');

    if (colorInput) {
        colorInput.addEventListener('change', updateDrawingProperties);
    }
    if (sizeInput) {
        sizeInput.addEventListener('change', updateDrawingProperties);
    }
}

function detectPlatform() {
    // Check if userAgentData is available
    const platform = navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform;

    // Normalize platform string to uppercase for consistent comparisons
    const normalizedPlatform = platform ? platform.toUpperCase() : '';

    // Detect Mac and Windows platforms
    const isMac = normalizedPlatform.indexOf('MAC') >= 0;
    const isWindows = normalizedPlatform.indexOf('WIN') >= 0;

    return { isMac, isWindows };
}

