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

function drawGrid() {
  const gridSize = 50;
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
}

function startDrawing(e) {
  isDrawing = true;
  const pos = stage.getPointerPosition();
  lastLine = new Konva.Line({
    stroke: 'black',
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
  const width = prompt("Enter map width (in squares):", "20");
  const height = prompt("Enter map height (in squares):", "15");
  const gridSize = 50; // pixels per grid square

  stage.width(width * gridSize);
  stage.height(height * gridSize);

  gridLayer.destroyChildren();
  layer.destroyChildren();

  drawGrid();
  layer.batchDraw();
}

// Add event listener for new map option
document.getElementById('new-map-option').addEventListener('click', createNewMap);
