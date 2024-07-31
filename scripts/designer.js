let stage, layer, gridLayer;
let currentTool = null;
let isDrawing = false;
let lastLine;
let gridSize = 50;
let gridOffset = { x: 0, y: 0 };
let isPanning = false;
let gridGroup;
let gridUpdateTimeout;
var menuNode = document.getElementById('menu');

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-container');
  
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: container.offsetWidth,
    height: container.offsetHeight
  });

  gridLayer = new Konva.Layer();
  stage.add(gridLayer);

  layer = new Konva.Layer();
  stage.add(layer);

  createGrid();
  setupEventListeners();
});

function createGrid() {
  if (!gridGroup) {
    gridGroup = new Konva.Group();
    gridLayer.add(gridGroup);
  }
  updateGrid();
}

document.getElementById('test').addEventListener('click', () => {
    alert("yay");
});

window.addEventListener('click', () => {
  // hide menu
  menuNode.style.display = 'none';
});

stage.on('contextmenu', function (e) {
    // prevent default behavior
    e.evt.preventDefault();
    if (e.target === stage) {
      // if we are on empty place of the stage we will do nothing
      return;
    }
    
    menuNode.style.display = 'initial';

function updateGrid() {
    //clear any grid updates pending to update
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
    
        for (let x = startX; x <= endX; x += gridSize) {
          const line = new Konva.Line({
            points: [x, startY, x, endY],
            stroke: '#ddd',
            strokeWidth: 1 / scale,
          });
          gridGroup.add(line);
        }
    
        for (let y = startY; y <= endY; y += gridSize) {
          const line = new Konva.Line({
            points: [startX, y, endX, y],
            stroke: '#ddd',
            strokeWidth: 1 / scale,
          });
          gridGroup.add(line);
        }
    
        gridLayer.batchDraw();
  }, 0);
  }
}

function handleZoom(e) {
    e.evt.preventDefault();
    
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    
    stage.scale({ x: newScale, y: newScale });
    
    const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    
    updateGrid();
    stage.batchDraw();
}

function setupEventListeners() {
  const toolbox = document.getElementById('toolbox');
  const popupToolBox = document.getElementById('popup-toolbox');
  
  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      const selectedTool = e.target.getAttribute('data-tool');
      if (currentTool === selectedTool) {
        // Deselect the tool
        currentTool = '';
        e.target.classList.remove('active');
        popupToolBox.style.display = 'none';
      } else {
        // Select the new tool
        currentTool = selectedTool;
        document.querySelectorAll('#toolbox button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        showToolOptions(currentTool, e.target);
      }
    }
  });

  stage.content.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Handle mouse events
  stage.on('mousedown', handleMouseDown);
  stage.on('mousemove', handleMouseMove);
  stage.on('mouseup', handleMouseUp);
  stage.on('wheel', handleZoom);

  document.getElementById('new-map-option').addEventListener('click', showNewMapOverlay);
  document.getElementById('toggle-toolbox').addEventListener('click', toggleToolbox);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

function handleKeyDown(e) {
  switch(e.key.toLowerCase()) {
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
      document.getElementById(`${currentTool}-snap`).checked = true;
      break;
  }
}

function handleKeyUp(e) {
  if (e.key.toLowerCase() === 'shift') {
    document.getElementById(`${currentTool}-snap`).checked = false;
  }
}

function selectTool(tool) {
  const toolButton = document.querySelector(`#toolbox button[data-tool="${tool}"]`);
  if (toolButton) {
    toolButton.click();
  }
}

function handleMouseDown(e) {
  if (e.evt.button === 2) { // Right mouse button
    isPanning = true;
    stage.container().style.cursor = 'grabbing';
  } else if (e.evt.button === 0) { // Left mouse button
    if (currentTool === 'draw' || currentTool === 'erase') {
      startDrawing(e);
    }
  }
}

function handleMouseMove(e) {
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

function handleMouseUp(e) {
  if (e.evt.button === 2) { // Right mouse button
    isPanning = false;
    stage.container().style.cursor = 'default';
  } else if (e.evt.button === 0) { // Left mouse button
    stopDrawing();
  }
}

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

function draw(e) {
  if (!isDrawing) return;
  const pos = getRelativePointerPosition(layer);
  let snapToGridEnabled = document.getElementById(`${currentTool}-snap`).checked || e.evt.shiftKey;
  
  let newPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;
  
  let newPoints = lastLine.points().concat([newPos.x, newPos.y]);
  lastLine.points(newPoints);
  layer.batchDraw();
}

function stopDrawing() {
  isDrawing = false;
}

function showNewMapOverlay() {
  console.log(layer.getChildren());
  const text = "Are you sure?\nThis will remove everything you've done so far?";

  if (layer.getChildren().length > 0) {
    if (confirm(text) == true) {
      layer.removeChildren();
    }
  }
}

function toggleToolbox() {
  const toolbox = document.getElementById('toolbox');
  const toggleButton = document.getElementById('toggle-toolbox');
  toolbox.classList.toggle('visible');
  toggleButton.innerHTML = toolbox.classList.contains('visible') ? '&#9658;&#9658;' : '&#9668;&#9668;';
}

function getRelativePointerPosition(node) {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage().getPointerPosition();
  return transform.point(pos);
}

function snapToGrid(x, y) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

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

  const rect = buttonElement.getBoundingClientRect();
  popupToolbox.style.left = `${rect.right + 10}px`;
  popupToolbox.style.top = `${rect.top}px`;
  popupToolbox.style.display = 'block';
}

function getToolOptions(tool) {
  switch (tool) {
    case 'draw':
      return [
        { id: 'draw-color', label: 'Color', type: 'color', value: '#000000' },
        { id: 'draw-size', label: 'Size', type: 'number', value: 5 },
        { id: 'draw-snap', label: 'Snap to Grid', type: 'checkbox' }
      ];
    case 'erase':
      return [
        { id: 'erase-size', label: 'Size', type: 'number', value: 20 },
        { id: 'erase-snap', label: 'Snap to Grid', type: 'checkbox' }
      ];
    case 'fill':
      return [
        { id: 'fill-color', label: 'Color', type: 'color', value: '#000000' },
        { id: 'fill-tolerance', label: 'Tolerance', type: 'number', value: 10 }
      ];
    default:
      return [];
  }
}
