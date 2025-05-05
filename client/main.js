const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const socket = io();
let isDrawer = false;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// === Game Setup ===
function startGame() {
  const username = document.getElementById('username').value.trim();
  if (!username) return alert("Enter a username first.");
  
  socket.emit('set-username', username);
  document.getElementById('login').style.display = 'none';
  document.getElementById('game').style.display = 'block';
}

// === Drawing ===
canvas.addEventListener('mousedown', (e) => {
  if (!isDrawer) return;
  isDrawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing || !isDrawer) return;

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  // Draw locally
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Send to server
  socket.emit('draw', {
    fromX: lastX,
    fromY: lastY,
    toX: currentX,
    toY: currentY
  });

  lastX = currentX;
  lastY = currentY;
});

socket.on('draw', (data) => {
  ctx.beginPath();
  ctx.moveTo(data.fromX, data.fromY);
  ctx.lineTo(data.toX, data.toY);
  ctx.strokeStyle = '#f00'; // Red lines from others
  ctx.lineWidth = 2;
  ctx.stroke();
});

// === Word Display ===
socket.on('your-turn', (word) => {
  isDrawer = true;
  document.getElementById('word-display').innerText = `Your word: ${word}`;
});

socket.on('guessing-time', (blanks) => {
  isDrawer = false;
  document.getElementById('word-display').innerText = `Guess the word: ${blanks}`;
});

// === Chat ===
const chatbox = document.getElementById('chatbox');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!input.value) return;
  socket.emit('chat', input.value);
  input.value = '';
});

socket.on('chat', ({ from, message }) => {
  chatbox.innerHTML += `<div><strong>${from}:</strong> ${message}</div>`;
  chatbox.scrollTop = chatbox.scrollHeight;
});

socket.on('correct-guess', ({ word, guesser }) => {
  chatbox.innerHTML += `<div style="color: green;"><strong>${guesser} guessed it!</strong> The word was <em>${word}</em>.</div>`;
  chatbox.scrollTop = chatbox.scrollHeight;
});
