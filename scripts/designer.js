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

  // Draw grid
  drawGrid();

  // Set up event listeners
  setupEventListeners();
});


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

function setupEventListeners() {
  const toolbox = document.getElementById('toolbox');
  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      currentTool = e.target.getAttribute('data-tool');
      document.querySelectorAll('#toolbox button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  stage.on('mousedown touchstart', startDrawing);
  stage.on('mousemove touchmove', draw);
  stage.on('mouseup touchend', stopDrawing);

  document.getElementById('new-map-option').addEventListener('click', createNewMap);
}

function startDrawing(e) {
  if (currentTool !== 'draw' && currentTool !== 'erase') return;
  isDrawing = true;
  const pos = stage.getPointerPosition();
  lastLine = new Konva.Line({
    stroke: currentTool === 'draw' ? 'black' : 'white',
    strokeWidth: 5,
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

// New map function
function createNewMap() {
  const overlay = document.createElement('div');
  overlay.id = 'new-map-overlay';
  overlay.innverHTML = `
    <div class="overlay-content">
      <h2>Create New Map</h2>
      <label for="map-width">Width (pixels):</label>
      <input type="number" id="map_width" value="800">
      <label for="map-height" value="600">
      <input type"number" id="map-height" value="600">
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
    initializeNewMap(width, height, gridSize)
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

document.getElementById('toggle-toolbox').addEventListener('click', function() {
  const toolbox = document.getElementById('toolbox');
  toolbox.classList.toggle('toolbox-side');
  toolbox.classList.toggle('visible');
});

// Add event listener for new map option
document.getElementById('new-map-option').addEventListener('click', createNewMap);
