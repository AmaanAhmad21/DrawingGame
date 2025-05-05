const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Track drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Start drawing
canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

// Draw while moving
const socket = io();
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  // Draw locally
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Send draw data to server
  socket.emit('draw', {
    fromX: lastX,
    fromY: lastY,
    toX: currentX,
    toY: currentY
  });

  lastX = currentX;
  lastY = currentY;
});

// When another player draws
socket.on('draw', (data) => {
  ctx.beginPath();
  ctx.moveTo(data.fromX, data.fromY);
  ctx.lineTo(data.toX, data.toY);
  ctx.strokeStyle = '#f00'; // Use red for others
  ctx.lineWidth = 2;
  ctx.stroke();
});

// Stop drawing
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

// Clear canvas
document.getElementById('clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('your-turn', (word) => {
    alert(`You're the drawer! Your word: ${word}`);
    // Start drawing – can enable canvas here
  });
  
  socket.on('guessing-time', (data) => {
    alert(`Guess the word: ${data.blanks}`);
    // Disable canvas here if needed
  });
  
  socket.on('correct-guess', (data) => {
    alert(`${data.guesser} guessed it right! The word was "${data.word}"`);
  });
  
