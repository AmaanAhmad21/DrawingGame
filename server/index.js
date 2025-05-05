const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const usernames = {}; // socket.id -> username
const words = ['apple', 'banana', 'car', 'laptop', 'guitar'];

let players = [];
let currentDrawer = null;
let currentWord = '';
let guessedCorrectly = false;

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // ✅ Username setup
  socket.on('set-username', (name) => {
    usernames[socket.id] = name;
    
    if (!players.includes(socket.id)) {
      players.push(socket.id);
      console.log(`Players connected: ${players.length}`);
    }

    if (players.length >= 2 && !currentDrawer) {
      startNewRound();
    }
  });

  // ✅ Handle drawing
  socket.on('draw', (data) => {
    if (socket.id === currentDrawer) {
      socket.broadcast.emit('draw', data);
    }
  });

  // ✅ Handle chat
  socket.on('chat', (msg) => {
    if (!currentWord || guessedCorrectly) return;

    const sender = usernames[socket.id] || socket.id;

    if (msg.toLowerCase().trim() === currentWord.toLowerCase()) {
      guessedCorrectly = true;
      io.emit('correct-guess', {
        word: currentWord,
        guesser: sender
      });
      setTimeout(() => startNewRound(), 3000);
    } else {
      io.emit('chat', {
        from: sender,
        message: msg
      });
    }
  });

  // ✅ Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    players = players.filter(id => id !== socket.id);
    delete usernames[socket.id];

    // Optional: End round or reassign drawer if current one disconnects
    if (socket.id === currentDrawer) {
      guessedCorrectly = true;
      setTimeout(() => startNewRound(), 1000);
    }
  });
});

// ✅ Start new round function
function startNewRound() {
  guessedCorrectly = false;

  if (players.length < 2) return;

  currentDrawer = players[Math.floor(Math.random() * players.length)];
  currentWord = words[Math.floor(Math.random() * words.length)];

  console.log(`🎮 New round: Drawer is ${usernames[currentDrawer]}, Word is "${currentWord}"`);

  io.to(currentDrawer).emit('your-turn', currentWord);

  players.forEach(id => {
    if (id !== currentDrawer) {
      io.to(id).emit('guessing-time', '_ '.repeat(currentWord.length).trim());
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
