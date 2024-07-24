document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const gridCanvas = document.getElementById('grid-canvas');
  const gridCtx = gridCanvas.getContext('2d');
  const toolbox = document.getElementById('toolbox');
  const toolbarPopup = document.getElementById('toolbar-popup');
  let isDrawing = false;
  let currentTool = 'draw';
  let currentColor = 'black';
  let drawingHistory = []; 

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    redrawCanvas();
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  toolbox.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      currentTool = e.target.getAttribute('data-tool');
      document.querySelectorAll('#toolbox button').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      showToolbarPopup(currentTool);
    }
  });

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  function startDrawing(e) {
    isDrawing = true;
    draw(e);
  }

  function draw(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'fill') {
      if (!isDrawing) {
        floodFill(x, y, hexToRgba(currentColor));
      }
      return;
    }

    if (!isDrawing) return;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    switch (currentTool) {
      case 'draw':
        ctx.strokeStyle = currentColor;
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

    if (colorsMatch(targetColor, fillColor)) return;

    function colorsMatch(color1, color2) {
      return color1[0] === color2[0] && color1[1] === color2[1] && 
             color1[2] === color2[2] && Math.abs(color1[3] - color2[3]) < 10;
    }

    function fill(x, y) {
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
      if (!colorsMatch(getPixelColor(imageData, x, y), targetColor)) return;

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
    gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
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

  function showToolbarPopup(tool) {
    toolbarPopup.innerHTML = ''; // Clear previous content
    switch (tool) {
      case 'draw':
        const colorPicker = document.createElement('input');
        var sizeSlider = document.createElement('input');

        //color picker
        colorPicker.type = 'color';
        colorPicker.value = currentColor;
        colorPicker.addEventListener('change', (e) => {
          currentColor = e.target.value;
        });

        //size
        sizeSlider.type = 'range';
        sizeSlider.min = '5';
        sizeSlider.max = '50';
        sizeSlider.value = '20';
        sizeSlider.addEventListener('input', (e) => {
          ctx.lineWidth = e.target.value;
        });
        
        toolbarPopup.appendChild(colorPicker);
        toolbarPopup.appendChild(sizeSlider);
        break;
      case 'fill':
        const colorPicker = document.createElement('input');
        var sizeSlider = document.createElement('input');

        //color picker
        colorPicker.type = 'color';
        colorPicker.value = currentColor;
        colorPicker.addEventListener('change', (e) => {
          currentColor = e.target.value;
        });

        //size
        sizeSlider.type = 'range';
        sizeSlider.min = '5';
        sizeSlider.max = '50';
        sizeSlider.value = '20';
        sizeSlider.addEventListener('input', (e) => {
          ctx.lineWidth = e.target.value;
        });
        
        toolbarPopup.appendChild(colorPicker);
        toolbarPopup.appendChild(sizeSlider);
        break;
      case 'erase':
        var sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = '5';
        sizeSlider.max = '50';
        sizeSlider.value = '20';
        sizeSlider.addEventListener('input', (e) => {
          ctx.lineWidth = e.target.value;
        });
        toolbarPopup.appendChild(sizeSlider);
        break;
    }
    toolbarPopup.style.display = 'block';
  }

  function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }

  document.querySelector('#new-map-option').addEventListener('click', createNewMap);

  // Initial draw of the grid
  drawGrid();
});
