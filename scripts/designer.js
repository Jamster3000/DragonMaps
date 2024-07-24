document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('map-canvas');
  const ctx = canvas.getContext('2d');
  const toolbox = document.getElementById('toolbox');
  let isDrawing = false;
  let currentTool = 'draw';

  // Set canvas size
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    // Redraw canvas content here if needed
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
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    if (currentTool === 'draw') {
      ctx.strokeStyle = 'black';
    } else if (currentTool === 'erase') {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 20; // Wider eraser
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
  }
});
