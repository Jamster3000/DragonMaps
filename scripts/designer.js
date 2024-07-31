let stage, layer, gridLayer;
let currentTool = null;
let isDrawing = false;
let lastLine;
let gridSize = 50;
let gridOffset = { x: 0, y: 0 };
let isPanning = false;
let gridgroup;

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

function updateGrid() {
  const stagePos = stage.position();
  const viewportWidth = stage.width();
  const viewportHeight = stage.height();

  const startX = Math.floor((0 - stagePos.x) / gridSize) * gridSize;
  const endX = Math.ceil((viewportWidth - stagePos.x) / gridSize) * gridSize;
  const startY = Math.floor((0 - stagePos.y) / gridSize) * gridSize;
  const endY = Math.ceil((viewportHeight - stagePos.y) / gridSize) * gridSize;

  gridGroup.destroyChildren();

  for (let x = startX; x <= endX; x += gridSize) {
    const line = new Konva.Line({
      points: [x, startY, x, endY],
      stroke: '#ddd',
      strokeWidth: 1,
    });
    gridGroup.add(line);
  }

  for (let y = startY; y <= endY; y += gridSize) {
    const line = new Konva.Line({
      points: [startX, y, endX, y],
      stroke: '#ddd',
      strokeWidth: 1,
    });
    gridGroup.add(line);
  }

  gridLayer.batchDraw();
}

function setupEventListeners() {
  const toolbox = document.getElementById('toolbox');
  const popupToolBox = document.getElementById('popup-toolbox');
  
  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      console.log(e.target.getAttribute('data-tool'));
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
      document.getElementById('draw-snap').checked = true;
      break;
    }
}

function handleKeyUp(e) {
    if (e.key.toLowerCase() === 'shift') {
      try {
         document.getElementById('draw-snap').checked = false;
      } catch (TypeError){}
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

function updateGridPosition() {
  const stagePos = stage.position();
  gridGroup.position({
    x: -stagePos.x % gridSize,
    y: -stagePos.y % gridSize
  });
  gridLayer.batchDraw();
}

function handleMouseUp(e) {
  if (e.evt.button === 2) { // Right mouse button
    isPanning = false;
    stage.container().style.cursor = 'default';
  } else if (e.evt.button === 0) { // Left mouse button
    stopDrawing();
  }
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
        { id: 'erase-size', label: 'Size', type: 'number', value: 20 },
        { id: 'erase-snap', label: 'Snap to Grid', type: 'checkbox', value: false }
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

function startDrawing(e) {
  isDrawing = true;
  const pos = getRelativePointerPosition(layer);
  const color = currentTool === 'draw' ? document.getElementById('draw-color').value : 'white';
  const size = currentTool === 'draw' ? parseInt(document.getElementById('draw-size').value) : parseInt(document.getElementById('erase-size').value);
  
  let snapToGridEnabled = document.getElementById('draw-snap').checked || e.evt.shiftKey;
  let startPos = snapToGridEnabled ? snapToGrid(pos.x, pos.y) : pos;
  
  lastLine = new Konva.Line({
    stroke: color,
    strokeWidth: size,
    globalCompositeOperation:
      currentTool === 'erase' ? 'destination-out' : 'source-over',
    points: [startPos.x, startPos.y],
    lineCap: 'round',
    lineJoin: 'round'
  });
  layer.add(lastLine);
}
function snapToGrid(x, y) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getRelativePointerPosition(layer);
  let snapToGridEnabled = document.getElementById('draw-snap').checked || e.evt.shiftKey;
  
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
