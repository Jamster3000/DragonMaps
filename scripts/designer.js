let stage, layer, gridLayer;
let currentTool = 'draw';
let isDrawing = false;
let lastLine;
let gridSize = 50; 
let gridOffset = { x: 0, y: 0 };

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-container');
  
  // Create Konva stage
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: container.offsetWidth,
    height: container.offsetHeight
    //draggable: true
  });

  // Create grid layer
  gridLayer = new Konva.Layer();
  stage.add(gridLayer);

  // Create main layer
  layer = new Konva.Layer();
  stage.add(layer);

  // Draw grid
  drawGrid();

  // Set up event listeners
  setupEventListeners();

  stage.on('mousedown touchstart', (e) => {
    if (e.target === stage) {
      stage.startDragPos = stage.getPointerPosition();
    }
  });

  stage.on('mousemove touchmove', (e) => {
    if (stage.startDragPos) {
      const pos = stage.getPointerPosition();
      const dx = pos.x - stage.startDragPos.x;
      const dy = pos.y - stage.startDragPos.y;
      stage.position({
        x: stage.x() + dx,
        y: stage.y() + dy
      });
      stage.startDragPos = pos;
      updateGrid();
    }
  });
  
  stage.on('mouseup touchend', () => {
    stage.startDragPos = null;
  });
  
});

function setupEventListeners() {
  const toolbox = document.getElementById('toolbox');
  const popupToolBox = document.getElementById('popup-toolbox');
  
  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      currentTool = e.target.getAttribute('data-tool');
      document.querySelectorAll('#toolbox button').forEach(btn => btn.classList.remove('active'));

      if (currentTool !== '') {
        e.target.classList.add('active');
        showToolOptions(currentTool, e.target);
      } else {
        popupToolBox.style.display = 'none';
      }
    }
  });

  stage.on('mousedown touchstart', startDrawing);
  stage.on('mousemove touchmove', draw);
  stage.on('mouseup touchend', stopDrawing);

  document.getElementById('new-map-option').addEventListener('click', createNewMap);
  document.getElementById('toggle-toolbox').addEventListener('click', toggleToolbox);

  // Add event listener for stage dragging
  stage.on('dragmove', updateGrid);

  // Add event listener for window resize
  window.addEventListener('resize', resizeStage);
}

function showToolOptions(tool, buttonElement) {
  const popupToolbox = document.getElementById('popup-toolbox');
  const toolOptions = document.getElementById('tool-options');
  toolOptions.innerHTML = '';

  const options = getToolOptions(tool);
  options.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.classList.add('tool-option');
    optionElement.innerHTML = `
      <label for="${option.id}">${option.label}:</label>
      ${option.type === 'select' 
        ? `<select id="${option.id}">${option.options.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
        : `<input type="${option.type}" id="${option.id}" value="${option.value}">`
      }
    `;
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
        { id: 'draw-snap', label: 'Snap to Grid', type: 'checkbox', value: false }
      ];
    case 'erase':
      return [
        { id: 'erase-size', label: 'Size', type: 'number', value: 20 }
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

function drawGrid() {
  gridLayer.destroyChildren();

  const stageRect = stage.getClientRect();
  const startX = Math.floor(gridOffset.x / gridSize) * gridSize - gridOffset.x;
  const startY = Math.floor(gridOffset.y / gridSize) * gridSize - gridOffset.y;
  const endX = stageRect.width + gridSize;
  const endY = stageRect.height + gridSize;

  for (let x = startX; x < endX; x += gridSize) {
    const line = new Konva.Line({
      points: [x, 0, x, stageRect.height],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  for (let y = startY; y < endY; y += gridSize) {
    const line = new Konva.Line({
      points: [0, y, stageRect.width, y],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  gridLayer.batchDraw();
}

function updateGrid() {
  const pos = stage.position();
  gridOffset.x = -pos.x;
  gridOffset.y = -pos.y;
  drawGrid();
}

function resizeStage() {
  const container = document.getElementById('canvas-container');
  stage.width(container.offsetWidth);
  stage.height(container.offsetHeight);
  drawGrid();
}

function startDrawing(e) {
  if (!currentTool || (currentTool !== 'draw' && currentTool !== 'erase')) return;
  isDrawing = true;
  
  const pos = stage.getRelativePointerPosition();
  const color = currentTool === 'draw' ? document.getElementById('draw-color').value : 'white';
  const size = currentTool === 'draw' ? parseInt(document.getElementById('draw-size').value) : parseInt(document.getElementById('erase-size').value);
  
  lastLine = new Konva.Line({
    stroke: color,
    strokeWidth: size,
    globalCompositeOperation:
      currentTool === 'erase' ? 'destination-out' : 'source-over',
    points: [pos.x, pos.y]
  });
  layer.add(lastLine);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = stage.getRelativePointerPosition();
  let newPoints = lastLine.points().concat([pos.x, pos.y]);
  lastLine.points(newPoints);
  layer.batchDraw();
}

function stopDrawing() {
  isDrawing = false;
}

function createNewMap() {
  showNewMapOverlay();
}

function showNewMapOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'new-map-overlay';
  overlay.innerHTML = `
    <div class="overlay-content">
      <h2>Create New Map</h2>
      <label for="map-width">Width (pixels):</label>
      <input type="number" id="map-width" value="800">
      <label for="map-height">Height (pixels):</label>
      <input type="number" id="map-height" value="600">
      <label for="grid-size">Grid Size (pixels):</label>
      <input type="number" id="grid-size" value="50">
      <button id="create-map">Create</button>
      <button id="cancel-create">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('create-map').addEventListener('click', function() {
    const width = parseInt(document.getElementById('map-width').value);
    const height = parseInt(document.getElementById('map-height').value);
    const gridSize = parseInt(document.getElementById('grid-size').value);
    initializeNewMap(width, height, gridSize);
    document.body.removeChild(overlay);
  });

  document.getElementById('cancel-create').addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
}

function initializeNewMap(width, height, newGridSize) {
  stage.width(width);
  stage.height(height);
  gridSize = newGridSize;

  gridLayer.destroyChildren();
  layer.destroyChildren();

  drawGrid();
  layer.batchDraw();
}

function toggleToolbox() {
  const toolbox = document.getElementById('toolbox');
  toolbox.classList.toggle('toolbox-side');
  toolbox.classList.toggle('visible');
}
