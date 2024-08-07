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
const MOVE_THRESHOLD = 5; // pixels
const CLICK_DURATION_THRESHOLD = 200; // milliseconds
let shortcutsLink = document.getElementById('shortcuts');
let shortcutsOverlay = document.getElementById('shortcuts-overlay');
let closeShortcuts = document.getElementById('close-shortcuts');
let shortcutsTable = document.getElementById('shortcuts-table');
let searchData = {};
let dropIndicator;

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

const memoizedSearch = (() => {
    const cache = new Map();
    return (query) => {
        if (cache.has(query)) {
            return cache.get(query);
        }
        const result = search(query);
        cache.set(query, result);
        return result;
    };
})();

const performSearch = debounce(() => {
    const query = searchBar.value.trim();
    const results = memoizedSearch(query);
    
    searchResults.style.display = query === "" ? "none" : "block";
    resultsContainer.innerHTML = ''; // Clear previous results

    console.log(`Performing search for "${query}"`);

    if (query !== "") {
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('result-item');

            const img = document.createElement('img');
            img.className = "image-results";
            img.alt = 'Search result image';
            img.style.border = "1px solid #FF4500";
            img.style.maxWidth = "100px";
            img.style.margin = "5px";
            img.title = 'Drag to reorder';
            img.draggable = true;
            
            // Add a loading placeholder
            img.src = 'path/to/placeholder.gif';
            
            // Add drag start event listener
            img.addEventListener('dragstart', onDragStart);

            resultItem.appendChild(img);
            resultsContainer.appendChild(resultItem);

            // Preload the actual image
            preloadImage(result.url)
                .then(() => {
                    img.src = result.url;
                })
                .catch(() => {
                    console.error(`Failed to load image: ${result.url}`);
                    img.src = 'path/to/error-image.png';
                });
        });
    }

    console.log(`Added ${results.length} results to the DOM`);
}, 300);


searchBar.addEventListener('input', performSearch);
function lazyLoadImages() {
    const images = resultsContainer.querySelectorAll('img[data-src]');
    const options = {
        root: null,
        rootMargin: '200px', // Start loading images 200px before they enter the viewport
        threshold: 0.1
    };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const fullImg = new Image();
                fullImg.src = img.dataset.src;
                fullImg.onload = () => {
                    img.src = fullImg.src;
                    img.removeAttribute('data-src');
                };
                observer.unobserve(img);
            }
        });
    }, options);
    images.forEach(img => observer.observe(img));
}

// Search on input change
searchBar.addEventListener('input', performSearch);

//Shows the search results when clicking on the search bar assuming there is something that has been searched and not cleared.
searchBar.addEventListener('focus', () => {
    if (searchBar.value === "") {
        console.log("show");
        searchResults.style.display = "none";
    } else {
        searchResults.style.display = "block";
    }
});

//hides the search result when clicking off it
document.addEventListener('click', (event) => {
    const target = event.target;
    if (!searchBar.contains(target) && !searchResults.contains(target)) {
        searchResults.style.display = "none";
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

    toolbox.addEventListener('click', function (e) {
        console.log('Toolbox clicked', e.target.tagName);
        if (isEditingText) {
            console.log('Ignoring click due to text editing');
            return;
        }
        if (e.target.tagName === 'BUTTON' || e.target.tagName === "I") {
            const selectedTool = e.target.getAttribute('data-tool');
            console.log('Tool clicked:', selectedTool, 'Current tool:', currentTool);

            currentTool = selectedTool;
            console.log('New current tool:', currentTool);

            document.querySelectorAll('#toolbox button').forEach(btn => {
                btn.classList.remove('active');
                console.log('Removed active class from', btn.getAttribute('data-tool'));
            });
            e.target.classList.add('active');
            console.log('Added active class to', selectedTool);

            showToolOptions(currentTool, e.target);
            updateCursor();
            console.log('Updated cursor for tool:', currentTool);
        }
    });

    function updateCursor() {
        switch (currentTool) {
            case 'draw':
                stage.container().style.cursor = 'crosshair';
                break;
            case 'erase':
                stage.container().style.cursor = 'url(eraser-cursor.png), auto';
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

    function hideToolOptions() {
        const popupToolbox = document.getElementById('popup-toolbox');
        popupToolbox.style.display = 'none';
    }

    stage.content.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    stage.on('contextmenu', function (e) {
        e.evt.preventDefault();
    });

    stage.on('click', function () {
        hideContextMenu();
    });

    // Handle mouse events
    stage.on('mousedown', handleMouseDown);
    stage.on('mousemove', handleMouseMove);
    stage.on('mouseup', handleMouseUp);
    stage.on('wheel', handleZoom);

    const stageContainer = stage.container();
    stageContainer.addEventListener('dragover', onDragOver);
    stageContainer.addEventListener('drop', onDrop);

    document.getElementById('new-map-option').addEventListener('click', showNewMapOverlay);
    document.getElementById('toggle-toolbox').addEventListener('click', toggleToolbox);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.getElementById('undo-menu-item').addEventListener('click', undo);
    document.getElementById('redo-menu-item').addEventListener('click', redo);
    document.getElementById('show-grid-menu-item').addEventListener('click', toggleGrid);
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
function onDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.src);
}

//allows for dropping images
function onDragOver(e) {
    e.preventDefault();
}

//when the image ahs been dropped
function onDrop(e) {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData('text');

    // Get the stage's container and its bounding rectangle
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();

    // Calculate the drop position relative to the stage
    const dropX = (e.clientX - stageRect.left - stage.x()) / stage.scaleX();
    const dropY = (e.clientY - stageRect.top - stage.y()) / stage.scaleY();

    // Create a new Konva Image
    const imageObj = new Image();
    imageObj.onload = function () {
        const konvaImage = new Konva.Image({
            image: imageObj,
            draggable: true,
            x: dropX,
            y: dropY,
            offsetX: this.width / 2,
            offsetY: this.height / 2
        });

        // Add the image to the layer
        layer.add(konvaImage);
        layer.batchDraw();

        // Record the action for undo/redo
        recordAction({
            type: 'addImage',
            image: konvaImage
        });
    };
    imageObj.src = imageUrl;
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

    

    if (e.altKey) {
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

    if (!e.altKey) {
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
            stage.container().style.cursor = 'grabbing';
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
        isPanning = false;
        isRightMouseDown = false;
        rightClickStartPos = null;
        rightClickStartTime = null;
        stage.container().style.cursor = 'default';
    } else if (e.evt.button === 0) { // Left mouse button
        stopDrawing();
    }
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
    console.log(searchData);
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

function addText(e) {
    const pos = getRelativePointerPosition(layer);
    const textNode = new Konva.Text({
        x: pos.x,
        y: pos.y,
        text: 'Type here',
        fontSize: parseInt(document.getElementById('text-size').value),
        fontFamily: document.getElementById('text-font').value,
        fill: document.getElementById('text-color').value,
        draggable: true,
        width: 200
    });

    layer.add(textNode);
    layer.draw();

    // Create textarea over canvas
    const textPosition = textNode.absolutePosition();
    const areaPosition = {
        x: stage.container().offsetLeft + textPosition.x,
        y: stage.container().offsetTop + textPosition.y,
    };

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = textNode.width() + 'px';
    textarea.style.height = textNode.height() + 'px';
    textarea.style.fontSize = textNode.fontSize() + 'px';
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.color = '#000000'; // Hard-coded color value for testing
    textarea.style.backgroundColor = 'blue';
    textarea.style.border = '1px solid #8A2BE2';
    textarea.style.borderRadius = '4px';
    textarea.style.padding = '4px';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';

    isEditingText = true;
    textarea.focus();

    textarea.addEventListener('input', function () {
        textNode.text(textarea.value);
        layer.draw();
    });

    textarea.addEventListener('blur', function () {
        textNode.text(textarea.value);
        layer.draw();
        document.body.removeChild(textarea);
        isEditingText = false;
    });

    // Double-click to edit
    textNode.on('dblclick', function () {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        const textPosition = this.absolutePosition();
        textarea.style.position = 'absolute';
        textarea.style.top = (textPosition.y-40 + stage.container().offsetTop) + 'px';
        textarea.style.left = (textPosition.x + stage.container().offsetLeft) + 'px';
        textarea.style.width = this.width()*1.15 + 'px';
        textarea.style.background = '#B19CD9';

        textarea.value = this.text();
        textarea.focus();

        textarea.addEventListener('input', () => {
            this.text(textarea.value);
            layer.draw();
        });

        textarea.addEventListener('blur', () => {
            this.text(textarea.value);
            layer.draw();
            document.body.removeChild(textarea);
        });
    });

    recordAction({
        type: 'addText',
        node: textNode
    });
}

function addShape(e) {
    const startPos = getRelativePointerPosition(layer);
    let shape;
    const shapeType = document.getElementById('shape-type').value;
    const commonProps = {
        x: startPos.x,
        y: startPos.y,
        fill: document.getElementById('shape-fill').value,
        stroke: document.getElementById('shape-stroke').value,
        strokeWidth: parseInt(document.getElementById('shape-stroke-width').value),
        draggable: false
    };

    switch (shapeType) {
        case 'Rectangle':
            shape = new Konva.Rect({
                ...commonProps,
                width: 1,
                height: 1
            });
            break;
        case 'Circle':
            shape = new Konva.Circle({
                ...commonProps,
                radius: 1
            });
            break;
        case 'Triangle':
            shape = new Konva.RegularPolygon({
                ...commonProps,
                sides: 3,
                radius: 1
            });
            break;
    }

    layer.add(shape);
    layer.draw();

    function onMouseMove(e) {
        const pos = getRelativePointerPosition(layer);
        let snapToGridEnabled = document.getElementById('shape-snap').checked || e.evt.shiftkey;
        let endPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;

        const width = Math.abs(endPos.x - startPos.x);
        const height = Math.abs(endPos.y - startPos.y);

        if (shapeType === 'Rectangle') {
            shape.width(width);
            shape.height(height);
            shape.position({
                x: Math.min(startPos.x, endPos.x),
                y: Math.min(startPos.y, endPos.y)
            });
        } else if (shapeType === 'Circle') {
            const radius = Math.sqrt(width * width + height * height) / 2;
            shape.radius(radius);
        } else if (shapeType === 'Triangle') {
            const radius = Math.sqrt(width * width + height * height) / 2;
            shape.radius(radius);
        }

        layer.batchDraw();
    }

    function onMouseUp() {
        stage.off('mousemove', onMouseMove);
        stage.off('mouseup', onMouseUp);

        shape.draggable(true);

        recordAction({
            type: 'addShape',
            node: shape
        });
    }

    stage.on('mousemove', onMouseMove);
    stage.on('mouseup', onMouseUp);
}


function shortcut_draggable() {
    const shortcut = document.querySelector(".overlay-content");
    if (shortcut) {
        dragElement(shortcut);
    }
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
    let snapToGridEnabled = document.getElementById(`${currentTool}-snap`).checked || e.evt.shiftKey;

    let newPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;

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
        } else {
            optionElement.innerHTML = `
        <label for="${option.id}">${option.label}:</label>
        ${option.type === 'select'
                    ? `<select id="${option.id}">${option.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
                    : `<input type="${option.type}" id="${option.id}" value="${option.value}">`
                }
      `;
        }
        toolOptions.appendChild(optionElement);
    });

    popupToolbox.style.display = 'block';
    positionToolboxPopup();
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
                    options: ['Arial', 'Verdana', 'Times New Roman', 'Courier']
                },
                {
                    id: 'text-size',
                    label: 'Size',
                    type: 'number',
                    value: 16
                },
                {
                    id: 'text-color',
                    label: 'Color',
                    type: 'color',
                    value: '#000000'
                }
            ];
        case 'shape':
            return [
                {
                    id: 'shape-type',
                    label: 'Shape',
                    type: 'select',
                    options: ['Rectangle', 'Circle', 'Triangle']
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

//recording the user's action which can be used to undo or redo
function recordAction(action) {
    actionHistory = actionHistory.slice(0, currentActionIndex + 1);
    actionHistory.push(action);
    currentActionIndex++;
}

function rightPanel() {
    const rightPanel = document.getElementById('right-panel');
    const toggleRightPanelButton = document.getElementById('toggle-right-panel');

    toggleRightPanelButton.addEventListener('click', toggleRightPanel);

    function toggleRightPanel() {
        rightPanel.classList.toggle('visible');
        toggleRightPanelButton.classList.toggle('panel-open');

        if (rightPanel.classList.contains('visible')) {
            toggleRightPanelButton.innerHTML = '&#9658;&#9658;';
        } else {
            toggleRightPanelButton.innerHTML = '&#9668;&#9668;';
        }
    }

    /*deals with the assets section of the right panel*/
    document.querySelectorAll('.section-header, .category-header').forEach(header => {
        header.addEventListener('click', function () {
            this.classList.toggle('active');
            let content = this.nextElementSibling;
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
            let icon = this.querySelector('.toggle-icon');
            icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
        });
    });


    // Load assets from the right panel
    function loadAssets(category, assets) {
        let container = document.querySelector(`#assets-section .asset-category:nth-child(${category}) .category-content`);
        assets.forEach(asset => {
            let img = document.createElement('img');
            img.src = asset.url;
            img.alt = asset.name;
            img.title = asset.name;
            img.draggable = true; // Make the image draggable
            img.addEventListener('dragstart', onDragStart);
            container.appendChild(img);
        });
    }

    //feature to export the finished battlemap onto the user's device
    document.getElementById('export-image').addEventListener('click', function () {
        // Implement image export logic
        console.log('Exporting as image...');
    });

    //export the battlemap to json or similar
    document.getElementById('export-json').addEventListener('click', function () {
        // Implement JSON export logic
        console.log('Exporting as JSON...');
    });
}
