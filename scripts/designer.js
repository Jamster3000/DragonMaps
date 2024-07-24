let stage, layer, gridLayer;
let currentTool = 'draw';
let isDrawing = false;
let lastLine;

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-area');
  
  // Create Konva stage
  stage = new Konva.Stage({
    container: 'canvas-area',
    width: container.offsetWidth,
    height: container.offsetHeight
  });

  // Create grid layer
  gridLayer = new Konva.Layer();
  stage.add(gridLayer);

  // Create main layer
  layer = new Konva.Layer();
  stage.add(layer);

  const toggleToolboxButton = document.getElementById('toggle-toolbox');
  if (toogleToolboxButton) {
    toggleToolboxButton.addEventListener('click', function() {
      const toolbox = document.getElemenetById('toolbox');
      if (toolbox) {
        toolbox.classList.toggle('toolbox-side');
        toolbox.classList.toggle('visible');
      }
    });
  }

  document.getElementById('toggle-toolbox').addEventListener('click', function() {
    const toolbox = document.getElementById('toolbox');
    toolbox.classList.toggle('toolbox-side');
    toolbox.classList.toggle('visible');
  });
  
  document.getElementById('new-map-option').addEventListener('click', createNewMap);
  
  // Draw grid
  drawGrid();

  // Set up event listeners
  setupEventListeners();
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
      }else {
        popupToolbox.style.display = 'none';
      }
    }
  });

  stage.on('mousedown touchstart', startDrawing);
  stage.on('mousemove touchmove', draw);
  stage.on('mouseup touchend', stopDrawing);

  document.getElementById('new-map-option').addEventListener('click', createNewMap);
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

function startDrawing(e) {
  if (!currentTool || (currentTool !== 'draw' && currentTool !== 'erase')) return;
  isDrawing = true;
  
  const pos = stage.getPointerPosition();
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
  const pos = stage.getPointerPosition();
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

function initializeNewMap(width, height, gridSize) {
  stage.width(width);
  stage.height(height);

  gridLayer.destroyChildren();
  layer.destroyChildren();

  drawGrid(gridSize);
  layer.batchDraw();
}

function drawGrid(gridSize) {
  const width = stage.width();
  const height = stage.height();

  for (let i = 0; i < width; i += gridSize) {
    const line = new Konva.Line({
      points: [i, 0, i, height],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  for (let i = 0; i < height; i += gridSize) {
    const line = new Konva.Line({
      points: [0, i, width, i],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  gridLayer.batchDraw();
}
