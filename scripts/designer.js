let stage, layer, gridLayer;
let currentTool = 'draw';
let isDrawing = false;
let lastLine;
let viewportX = 0;
let viewportY = 0;
const gridSize = 50; // Default grid size
const viewportWidth = 800; // Viewport width
const viewportHeight = 600; // Viewport height

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-area');
  
  // Create Konva stage with viewport size
  stage = new Konva.Stage({
    container: 'canvas-area',
    width: viewportWidth,
    height: viewportHeight
  });

  // Create grid layer
  gridLayer = new Konva.Layer();
  stage.add(gridLayer);

  // Create main layer
  layer = new Konva.Layer();
  stage.add(layer);

  // Set up event listeners
  setupEventListeners();

  // Initial draw of the grid
  drawGrid();
});

function setupEventListeners() {
  // ... (keep your existing event listeners)

  // Add event listener for stage dragging
  stage.draggable(true);
  stage.on('dragmove', updateViewport);
}

function updateViewport() {
  viewportX = -stage.x();
  viewportY = -stage.y();
  drawGrid();
}

function drawGrid() {
  gridLayer.destroyChildren();

  const startX = Math.floor(viewportX / gridSize) * gridSize;
  const startY = Math.floor(viewportY / gridSize) * gridSize;
  const endX = startX + viewportWidth + gridSize;
  const endY = startY + viewportHeight + gridSize;

  for (let x = startX; x < endX; x += gridSize) {
    const line = new Konva.Line({
      points: [x - viewportX, 0, x - viewportX, viewportHeight],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  for (let y = startY; y < endY; y += gridSize) {
    const line = new Konva.Line({
      points: [0, y - viewportY, viewportWidth, y - viewportY],
      stroke: '#ddd',
      strokeWidth: 1
    });
    gridLayer.add(line);
  }

  gridLayer.batchDraw();
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
    points: [pos.x + viewportX, pos.y + viewportY]
  });
  layer.add(lastLine);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = stage.getPointerPosition();
  let newPoints = lastLine.points().concat([pos.x + viewportX, pos.y + viewportY]);
  lastLine.points(newPoints);
  layer.batchDraw();
}

// Remove or modify these functions as they're no longer needed
// function createNewMap() { ... }
// function showNewMapOverlay() { ... }
// function initializeNewMap() { ... }

// ... (keep other utility functions)
