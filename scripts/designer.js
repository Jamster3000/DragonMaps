let stage, layer, gridLayer;
let currentTool = 'draw';
let isDrawing = false;
let lastLine;
const gridSize = 50; // Default grid size
let stageWidth = window.innerWidth;
let stageHeight = window.innerHeight;

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-container');
  
  // Create Konva stage
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: stageWidth,
    height: stageHeight,
    draggable: true
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
  stage.on('dragmove', updateGrid);

  // Add event listener for window resize
  window.addEventListener('resize', resizeStage);
}

function updateGrid() {
  drawGrid();
}

function drawGrid() {
  gridLayer.destroyChildren();

  const stageRect = stage.getClientRect();
  const startX = Math.floor(stageRect.x / gridSize) * gridSize - stageRect.x;
  const startY = Math.floor(stageRect.y / gridSize) * gridSize - stageRect.y;
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

function resizeStage() {
  stageWidth = window.innerWidth;
  stageHeight = window.innerHeight;
  stage.width(stageWidth);
  stage.height(stageHeight);
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

// ... (keep other utility functions)
