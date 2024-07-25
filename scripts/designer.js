let stage, layer, gridLayer;
let currentTool = 'draw';
let isDrawing = false;
let lastLine;
let gridSize = 50; // Default grid size

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('canvas-container');
  
  // Create Konva stage
  stage = new Konva.Stage({
    container: 'canvas-container',
    width: container.offsetWidth,
    height: container.offsetHeight,
    draggable: true
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
  // ... (keep this function as is) ...
}

function getToolOptions(tool) {
  // ... (keep this function as is) ...
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

function updateGrid() {
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
  // ... (keep this function as is) ...
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
