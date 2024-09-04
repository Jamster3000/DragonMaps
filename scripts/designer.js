let stage, layer, gridLayer;
let currentTool = null;
let isDrawing = false;
let lastLine;
let gridSize = 50;
let gridActive = true;
let gridPattern;
let gridOffset = {
    x: 0,
    y: 0
};
let isPanning = false;
let gridGroup;
let gridUpdateTimeout;
var menuNode = document.getElementById('menu');
let actionHistory = [];
let currentActionIndex = -1;
let activeMenu = null;
let activeMenuItem = -1;
let isShowingContextMenu = false;
let isRightMouseDown = false;
let rightClickStartPos = null;
let rightClickStartTime = null;
let isEditingText = false;
let isSearchBarFocused = false;
let savedCursor;
const MOVE_THRESHOLD = 5; // pixels
const CLICK_DURATION_THRESHOLD = 200; // milliseconds
let shortcutsLink = document.getElementById('shortcuts');
let shortcutsOverlay = document.getElementById('shortcuts-overlay');
let closeShortcuts = document.getElementById('close-shortcuts');
let shortcutsTable = document.getElementById('shortcuts-table');
let searchData = {};
let dropIndicator;
const transformers = [];
let currentTransformer;
let imagePresenceCallback;
let imageNode = null;
let currentPage = 1;
const resultsPerPage = 20;
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('canvas-container');

    //creates a new stage
    stage = new Konva.Stage({
        container: 'canvas-container',
        width: container.offsetWidth,
        height: container.offsetHeight
    });

    //creates and adds a grid layer to the canvas
    gridLayer = new Konva.Layer();
    stage.add(gridLayer);

    //adds layer to the canvas that everything is drawn and placed on.
    layer = new Konva.Layer();
    stage.add(layer);

    createGrid(); //creates the grid on the grid layer
    setupEventListeners(); //creates and manages event listeners
    setupShortcutKeyHelp(); //creates te shortcut key help overlay
    shortcut_draggable();
    rightPanel(); //manages the right panel, toggle, and everything included in the right panel
    popup_draggable();//makes the popup tool box draggable
    loadSearch();
    loadCustomFont();//load in any custom imported fonts that are saved in cache

    setInterval(checkImageOnCanvas, 10);
});

//listens for the right click menu
document.addEventListener('click', function (event) {
    if (activeMenu && !document.getElementById(`${activeMenu}-menu`).contains(event.target)) {
        toggleMenu(activeMenu);
    }

    if (!isShowingContextMenu) {
        hideContextMenu(); // Hide the context menu on click if it is not being shown
    }
});

document.addEventListener('click', function () {
    hideContextMenu();
})

//searches for each character input
//uses debounce to reduce the amount of search calls
//uses memoization to cache results and recall from them
// makes use of dociment fragment for better performance rather than manipulating the DOM directly.
//uses lazy loading only loading images in that are in viewport
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

//hides the right click menu
window.addEventListener('click', () => {
    menuNode.style.display = 'none';
});

//resizes the toolbox popup depending whether the toolbox is visible or not
window.addEventListener('resize', positionToolboxPopup);

//all the other even listerns for eventListener or stages
function setupEventListeners() {
    const toolbox = document.getElementById('toolbox');
    const newMapOption = document.getElementById('new-map-option');
    const toggleToolboxButton = document.getElementById('toggle-toolbox');
    const undoMenuItem = document.getElementById('undo-menu-item');
    const redoMenuItem = document.getElementById('redo-menu-item');
    const showGridMenuItem = document.getElementById('show-grid-menu-item');

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
                    updateCursor(); // Update cursor based on tool
                    updateShapesDraggable(); // Update shape draggable status
                } else {
                    document.querySelectorAll('#toolbox button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    targetElement.classList.add('active');
                    currentTool = selectedTool;
                    showToolOptions(currentTool, targetElement);
                    updateCursor();
                    updateShapesDraggable();
                }
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

        stage.on('contextmenu', function (e) {
            e.evt.preventDefault();
        });

        stage.on('click', function () {
            hideContextMenu();
        });

        // Handle mouse events on the stage
        stage.on('mousedown', handleMouseDown);
        stage.on('mousemove', handleMouseMove);
        stage.on('mouseup', handleMouseUp);
        stage.on('wheel', handleZoom);

        // Handle clicking on stage to remove transformer
        stage.on('click', function () {
            if (currentTransformer) {
                currentTransformer.nodes([]); // Remove the transformer from the currently selected image
                currentTransformer = null; // Clear the current transformer reference
                layer.batchDraw();
            }
        });

        const stageContainer = stage.container();
        if (stageContainer) {
            stageContainer.addEventListener('dragover', onDragOver);
            stageContainer.addEventListener('drop', onDrop);
        }
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

    if (exportImageButton) {
        exportImageButton.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent any default action
            // Ensure all layers are drawn before exporting
            stage.draw();
            // Generate a data URL of the current state of the canvas
            const dataURL = stage.toDataURL({
                pixelRatio: 3, // Adjust the pixel ratio for image quality
            });
            // Create a hidden link element
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = 'battlemap.png'; // Set the name of the downloaded file
            // Append the link to the body (it won't be visible)
            document.body.appendChild(link);
            // Programmatically click the link to trigger the download
            link.click();
            // Remove the link from the document
            document.body.removeChild(link);
            console.log('Exporting as image...');
        });
    }

    if (exportJsonButton) {
        exportJsonButton.addEventListener('click', function () {
            console.log('Exporting as JSON...');
        });
    }
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
    const shortcuts = [
        { key: 'Alt + T', description: 'Toggle toolbox' },
        { key: 'Alt + R', description: 'Toggle right panel' },
        { key: 'Alt + G', description: 'Toggle grid' },
        { key: 'Alt + N', description: 'New map' },
        { key: 'D', description: 'Select draw tool' },
        { key: 'E', description: 'Select erase tool' },
        { key: 'S', description: 'Select select tool' },
        { key: 'Ctrl + Z', description: 'Undo' },
        { key: 'Ctrl + Y', description: 'Redo' },
        { key: 'Alt + N', description: 'New Map' },
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

function onDrop(e) {
    e.preventDefault();
    console.log('Drop event:', e);
    const elementId = e.dataTransfer.getData('text/plain');
    const draggedElement = document.getElementById(elementId);

    // Get the stage's container and its bounding rectangle
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();

    // Calculate the drop position relative to the stage
    const dropX = (e.clientX - stageRect.left - stage.x()) / stage.scaleX();
    const dropY = (e.clientY - stageRect.top - stage.y()) / stage.scaleY();

    if (draggedElement && draggedElement.id === 'watermark') {
        // Create a new Konva Image using the dragged element
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

        // Add the image to the layer and record the action
        layer.add(konvaImage);
        layer.draw();

        recordAction({
            type: 'addImage',
            image: konvaImage
        });

        // Set up click event for the image
        konvaImage.on('click', function (evt) {
            if (currentTransformer) {
                currentTransformer.nodes([]);
                layer.batchDraw();
            }

            transformer.nodes([konvaImage]);
            currentTransformer = transformer;
            layer.batchDraw();

            evt.cancelBubble = true;
        });

        const transformer = new Konva.Transformer({
            nodes: [konvaImage],
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

        const minSize = 150;
        const maxSize = 30000;

        transformer.on('transform', () => {
            const scaleX = konvaImage.scaleX();
            const scaleY = konvaImage.scaleY();

            const width = konvaImage.width() * scaleX;
            const height = konvaImage.height() * scaleY;

            const newWidth = Math.max(minSize, Math.min(maxSize, width));
            const newHeight = Math.max(minSize, Math.min(maxSize, height));

            konvaImage.scaleX(newWidth / konvaImage.width());
            konvaImage.scaleY(newHeight / konvaImage.height());
        });

        layer.add(transformer);
        transformer.nodes([konvaImage]);
        currentTransformer = transformer;
        layer.batchDraw();
    } else {
        // Handle case where the image URL is provided
        const imageUrl = e.dataTransfer.getData('text');

        // Check if the image URL is a WebP image
        if (imageUrl.endsWith('.webp')) {
            // Convert WebP URL to PNG URL
            const pngUrl = imageUrl.replace('.webp', '.png');

            // Load the PNG image
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Ensure CORS is handled
            img.onload = function () {
                // Create a Konva Image from the PNG image
                const konvaImage = new Konva.Image({
                    image: img,
                    draggable: true,
                    x: dropX,
                    y: dropY,
                    offsetX: img.width / 2,
                    offsetY: img.height / 2,
                });

                const transformer = new Konva.Transformer({
                    nodes: [konvaImage],
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

                layer.add(konvaImage);
                layer.add(transformer);

                recordAction({
                    type: 'addImage',
                    image: konvaImage
                });

                konvaImage.on('click', function (evt) {
                    if (currentTransformer) {
                        currentTransformer.nodes([]);
                        layer.batchDraw();
                    }

                    transformer.nodes([konvaImage]);
                    currentTransformer = transformer;
                    layer.batchDraw();

                    evt.cancelBubble = true;
                });

                transformer.nodes([konvaImage]);
                currentTransformer = transformer;
                layer.batchDraw();
                stage.batchDraw();

                console.log('PNG image added to canvas successfully');
            };

            img.onerror = function (error) {
                console.error('Error loading PNG image:', error);
                // Optionally, handle fallback here
            };

            // Start loading the PNG image
            img.src = pngUrl;
        } else {
            // Handle non-WebP image URLs (if needed)
            console.warn('The image URL is not a WebP image.');
        }
    }
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
        { label: 'Add Text', action: addText },
        { label: 'Paste', action: paste },
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.label;
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

    if (e.ctrlKey) {
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

    if ((!isMac && e.altKey) || (isMac && e.metaKey) || (isWindows && e.altKey)) {addS
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
            case 'u':
                e.preventDefault();
                window.open("tutorials.html", '_blank').focus();
        }
    }

    const textInput = document.getElementById('text-content');
    const fontInput = document.getElementById('import-google-font');
    const editArea = document.getElementById('text-edit');

    var isFocused = (document.activeElement === textInput);
    var isFontFocused = (document.activeElement === fontInput);
    var isEditing = (document.activeElement === editArea);

    if ((!isMac && e.altKey) || (isMac && e.metaKey) || (isWindows && e.altKey)) {
        switch (e.key.toLowerCase()) {
            case 'd':
                selectTool('draw');
                break;
            case 'e':
                selectTool('erase');
                break;
            case 's':
                selectTool('select');
                break;
            case 'f':
                selectTool('fill');
                break;
            case 'shift':
                try {
                    document.getElementById(`${currentTool}-snap`).checked = true;
                    break;
                } catch (TypeError) { }
        }
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
        }
    }
}


//==============================
//tools and features
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
function popup_draggable() {
    const popupToolbox = document.getElementById("toolbar-popup");
    if (popupToolbox) {
        dragElement(popupToolbox);
    }
}

//allowing of dragging elements
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    elmnt.onmousedown = function (e) {
        // Check if the target is an input field
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
            return; // Prevent dragging when clicking on input elements
        }
        dragMouseDown(e);
    };

    function dragMouseDown(e) {
        e = e || window.e;
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
    if (toolButton) {
        toolButton.click();
        currentTool = tool;
        updateShapesDraggable();
        updateCursor();
    }
}

//for the drawing tool
function startDrawing(e) {
    isDrawing = true;
    const pos = getRelativePointerPosition(layer);
    const size = currentTool === 'draw' ? parseInt(document.getElementById('draw-size').value) : parseInt(document.getElementById('erase-size').value);

    let snapToGridEnabled = document.getElementById(`${currentTool}-snap`).checked || e.evt.shiftKey;
    let startPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;

    lastLine = new Konva.Line({
        stroke: currentTool === 'draw' ? document.getElementById('draw-color').value : 'white',
        strokeWidth: size,
        globalCompositeOperation: currentTool === 'erase' ? 'destination-out' : 'source-over',
        points: [startPos.x, startPos.y],
        lineCap: 'round',
        lineJoin: 'round'
    });
    layer.add(lastLine);
}

//also for the drawing tool
function draw(e) {
    if (!isDrawing) return;

    const pos = getRelativePointerPosition(layer);

    let straightLineEnabled = e.evt.altKey;
    let snapToGridEnabled = !straightLineEnabled && (document.getElementById(`${currentTool}-snap`).checked || e.evt.shiftKey);

    let newPos;

    if (straightLineEnabled) {
        // Get the start position of the line
        const startPos = { x: lastLine.points()[0], y: lastLine.points()[1] };

        // Calculate the angle of the line
        const dx = pos.x - startPos.x;
        const dy = pos.y - startPos.y;

        // Determine the direction (horizontal or vertical) based on the larger difference
        if (Math.abs(dx) > Math.abs(dy)) {
            newPos = { x: pos.x, y: startPos.y };  // Horizontal line
        } else {
            newPos = { x: startPos.x, y: pos.y };  // Vertical line
        }
    } else if (snapToGridEnabled) {
        newPos = snapToGrid(pos.x, pos.y);
    } else {
        newPos = pos;
    }

    let newPoints = lastLine.points().concat([newPos.x, newPos.y]);

    lastLine.points(newPoints);
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
        }
        else if (option.type === "breakline") {
            optionElement.innerHTML = `
            <hr>
      `;
        } else {
            optionElement.innerHTML = `
        <label for="${option.id}">${option.label}:</label>
        ${option.type === 'select'
                    ? `<select id="${option.id}">${option.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
                : `<input placeholder="${option.placeholder}" type="${option.type}" id="${option.id}" value="${option.value}">`
                }
      `;
        }
        toolOptions.appendChild(optionElement);
    });

    popupToolbox.style.display = 'block';
    positionToolboxPopup();

    try {
        document.getElementById('import-font-button').addEventListener('click', loadGoogleFont);
    } catch (TypeError) { }
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
                        'Helvetica',
                        'Times New Roman',
                        'Times',
                        'Courier New',
                        'Courier',
                        'Verdana',
                        'Georgia',
                        'Palatino',
                        'Garamond',
                        'Bookman',
                        'Comic Sans MS',
                        'Trebuchet MS',
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
                    id: 'text-color',
                    label: 'Color',
                    type: 'color',
                    value: '#ffffff'
                }, 
                {
                    id: 'import-google-font',
                    label: 'Import Google Font',
                    type: 'text',
                    placeholder: "Google Font Name",
                    value: ""
                },
                {
                    id: 'import-font-button',
                    label: 'Import Font',
                    value: 'Import Font',
                    type: 'button'
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

//redo reature
function redo() {
    if (currentActionIndex < actionHistory.length - 1) {
        currentActionIndex++;
        updateCanvas();
    }
}

function addText(e) {
    const pos = getRelativePointerPosition(layer);
    const text = document.getElementById('text-content').value;
    const fontName = document.getElementById('text-font').value;

    // Load the font before adding the text node
    document.fonts.load(`16px ${fontName}`).then(() => {
        const textNode = new Konva.Text({
            x: pos.x,
            y: pos.y,
            text: text,
            fontSize: parseInt(document.getElementById('text-size').value),
            fontFamily: fontName,
            fill: document.getElementById('text-color').value,
            draggable: true,
            width: 400
        });

        layer.add(textNode);
        layer.draw();

        // Double-click to edit
        textNode.on('dblclick', function () {
            createTextEditor(this);
        });

        recordAction({
            type: 'addText',
            node: textNode
        });
    }).catch((error) => {
        console.error(`Failed to load font ${fontName}:`, error);
    });
}

function createTextEditor(textNode) {
    if (!isEditingText) {
        const textPosition = textNode.absolutePosition();
        const areaPosition = {
            x: stage.container().offsetLeft + textPosition.x,
            y: stage.container().offsetTop + textPosition.y - 80, // Adjusted the Y position to be 80 pixels higher
        };

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.value = textNode.text();
        textarea.id = "text-edit";
        textarea.style.position = 'absolute';
        textarea.style.top = areaPosition.y + 'px';
        textarea.style.left = areaPosition.x + 'px';
        textarea.style.width = textNode.width() * stage.scaleX() + 'px';
        textarea.style.fontSize = (textNode.fontSize() * stage.scaleY()) + 'px';
        textarea.style.fontFamily = textNode.fontFamily();
        textarea.style.backgroundColor = '#B19CD9';
        textarea.style.border = '1px solid #8A2BE2';
        textarea.style.borderRadius = '4px';
        textarea.style.padding = '4px';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';

        textarea.style.overflow = 'auto'; // or 'scroll' if you always want a scrollbar visible
        textarea.style.minHeight = '20px'; // or any suitable value for single-line text
        textarea.style.maxHeight = '100px'; // or any suitable value to limit height

        // Adjust height dynamically based on content
        textarea.style.height = 'auto';
        textarea.style.boxSizing = 'border-box'; // Include padding and border in element's total width and height
        textarea.style.whiteSpace = 'pre-wrap'; // Preserve whitespace and line breaks

        


        textarea.focus();

        textarea.addEventListener('input', function () {
            textNode.text(textarea.value);
            layer.draw();
        });

        textarea.addEventListener('keydown', function (event) {
            // Stop editing text when the Esc key is pressed
            if (event.key === 'Escape') {
                textNode.text(textarea.value);
                layer.draw();
                try {
                    document.body.removeChild(textarea);
                } catch (TypeError) { };
                isEditingText = false;
            } else {
                // Prevent tool shortcuts during text editing
                if (isEditingText && (event.key === 'e' || event.key === 'd')) {
                    event.stopPropagation();
                }
            }
        });

        textarea.addEventListener('blur', function () {
            textNode.text(textarea.value);
            layer.draw();
            try {
                document.body.removeChild(textarea);
            } catch (TypeError) { }
            isEditingText = false;
        });

        isEditingText = true;
    }
}

function loadGoogleFont() {
    const fontName = document.getElementById('import-google-font').value;
    if (fontName && !searchData[fontName]) {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(' ', '+')}`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Add the new font to the font select options
        const fontSelect = document.getElementById('text-font');
        const option = document.createElement('option');
        option.value = fontName;
        option.textContent = fontName;
        fontSelect.appendChild(option);
        fontSelect.value = fontName;

        // Store the font for future use too
        searchData[fontName] = true;

        // Ensure the font is loaded
        document.fonts.load(`16px ${fontName}`).then(() => {
        });
    }
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
        exportImageButton.addEventListener('click', function (e) {
            e.preventDefault();
            if (stage) {
                stage.draw();
                const dataURL = stage.toDataURL({
                    pixelRatio: 3,
                });
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = 'battlemap.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log('Exporting as image...');
            }
        });
    }

    if (exportJsonButton) {
        exportJsonButton.addEventListener('click', function () {
            console.log('Exporting as JSON...');
        });
    }
}


function loadCustomFont() {
    for (let fontName in searchData) {
        if (searchData.hasOwnProperty(fontName)) {
            try {
                const link = document.createElement('link');
                link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(' ', '+')}`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);

                const fontSelect = document.getElementById('text-font');
                const option = document.createElement('option');
                option.value = fontName;
                option.textContent = fontName;
                fontSelect.appendChild(option);
            } catch (TypeError) { }
        }
    }
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
