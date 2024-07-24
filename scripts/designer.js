document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.createElement('canvas');
  const gridCtx = gridCanvas.getContext('2d');
  const toolbox = document.getElementById('toolbox');
  let isDrawing = false;
  let currentTool = 'draw';
  let drawingHistory = [];

  // Set initial canvas size
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
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
    if (!isDrawing && currentTool !== 'fill') return;

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
        break;
      case 'erase':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.globalCompositeOperation = 'source-over';
        break;
      case 'fill':
        floodFill(x, y, [255, 0, 0, 255]); // Fill with red color
        break;
    }
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      ctx.beginPath();
      saveDrawingState();
    }
  }

  function saveDrawingState() {
    drawingHistory.push(canvas.toDataURL());
  }

  function floodFill(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixelColor(imageData, x, y);

    function matchColor(x, y) {
      const color = getPixelColor(imageData, x, y);
      return color[0] === targetColor[0] && color[1] === targetColor[1] && color[2] === targetColor[2] && color[3] === targetColor[3];
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
    saveDrawingState();
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
    gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    gridCtx.lineWidth = 1;

    for (let x = 0; x <= gridCanvas.width; x += size) {
      gridCtx.beginPath();
      gridCtx.moveTo(x, 0);
      gridCtx.lineTo(x, gridCanvas.height);
      gridCtx.stroke();
    }

    for (let y = 0; y <= gridCanvas.height; y += size) {
      gridCtx.beginPath();
      gridCtx.moveTo(0, y);
      gridCtx.lineTo(gridCanvas.width, y);
      gridCtx.stroke();
    }
  }

  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (drawingHistory.length > 0) {
      const img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0);
      }
      img.src = drawingHistory[drawingHistory.length - 1];
    }
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    drawGrid();
  }

  function createNewMap() {
    const width = prompt("Enter map width (in squares):", "20");
    const height = prompt("Enter map height (in squares):", "15");
    const gridSize = 50; // pixels per grid square

    canvas.width = width * gridSize;
    canvas.height = height * gridSize;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;

    drawingHistory = []; // Clear existing drawing history
    redrawCanvas();
  }

  // Add this to your File menu options
  document.querySelector('#new-map-option').addEventListener('click', createNewMap);

  // Initial draw of the grid
  drawGrid();
});
