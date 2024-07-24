document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const toolbox = document.getElementById('toolbox');
  let isDrawing = false;
  let currentTool = 'draw';
  let objects = [];
  let selectedObject = null;

  // Set initial canvas size
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redrawCanvas();
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Tool selection
  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      currentTool = e.target.getAttribute('data-tool');
      document.querySelectorAll('#toolbox button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
    }
  });

  // Drawing functionality
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  function startDrawing(e) {
    isDrawing = true;
    draw(e);
  }

  function draw(e) {
    if (!isDrawing && currentTool !== 'select' && currentTool !== 'fill') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    switch (currentTool) {
      case 'draw':
        ctx.strokeStyle = 'black';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        addObject('line', x, y, ctx.lineWidth, ctx.lineWidth);
        break;
      case 'erase':
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 20;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        break;
      case 'select':
        selectObject(x, y);
        redrawCanvas();
        if (selectedObject) {
          ctx.strokeStyle = 'red';
          ctx.strokeRect(selectedObject.x, selectedObject.y, selectedObject.width, selectedObject.height);
        }
        break;
      case 'fill':
        floodFill(x, y, [255, 0, 0, 255]); // Fill with red color
        break;
    }
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
  }

  function addObject(type, x, y, width, height) {
    objects.push({ type, x, y, width, height });
  }

  function selectObject(x, y) {
    selectedObject = objects.find(obj => 
      x >= obj.x && x <= obj.x + obj.width &&
      y >= obj.y && y <= obj.y + obj.height
    );
  }

  function floodFill(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixelColor(imageData, x, y);

    function matchColor(x, y) {
      const color = getPixelColor(imageData, x, y);
      return color[0] === targetColor[0] && color[1] === targetColor[1] && color[2] === targetColor[2];
    }

    function fill(x, y) {
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
      if (!matchColor(x, y)) return;

      setPixelColor(imageData, x, y, fillColor);

      fill(x + 1, y);
      fill(x - 1, y);
      fill(x, y + 1);
      fill(x, y - 1);
    }

    fill(x, y);
    ctx.putImageData(imageData, 0, 0);
  }

  function getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return imageData.data.slice(index, index + 4);
  }

  function setPixelColor(imageData, x, y, color) {
    const index = (y * imageData.width + x) * 4;
    imageData.data.set(color, index);
  }

  function drawGrid(size = 50) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function redrawCanvas() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw grid
    drawGrid();
    
    // Redraw all objects
    objects.forEach(obj => {
      // Implement drawing logic for each object type
      if (obj.type === 'line') {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.width / 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
      }
    });
  }

  function createNewMap() {
    const width = prompt("Enter map width (in squares):", "20");
    const height = prompt("Enter map height (in squares):", "15");
    const gridSize = 50; // pixels per grid square

    canvas.width = width * gridSize;
    canvas.height = height * gridSize;

    objects = []; // Clear existing objects
    redrawCanvas();
  }

  // Add this to your File menu options
  // document.querySelector('#new-map-option').addEventListener('click', createNewMap);

  // Initial draw of the grid
  drawGrid();
});
