const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server); // Attach socket.io to the server

const words = ['apple', 'banana', 'car', 'laptop', 'guitar'];

let players = [];
let currentDrawer = null;
let currentWord = '';
let guessedCorrectly = false;

// Serve frontend
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  socket.on('draw', (data) => {
    // Send to everyone except the drawer
    socket.broadcast.emit('draw', data);
    players.push(socket);

    console.log(`Players connected: ${players.length}`);

    if (players.length >= 2 && !currentDrawer) {
        startNewRound();
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

function startNewRound() {
    guessedCorrectly = false;
  
    // Pick a drawer
    const randomIndex = Math.floor(Math.random() * players.length);
    currentDrawer = players[randomIndex].id;
  
    // Pick a word
    currentWord = words[Math.floor(Math.random() * words.length)];
  
    console.log(`New round: Drawer is ${currentDrawer}, Word is "${currentWord}"`);
  
    // Tell the drawer the word
    io.to(currentDrawer).emit('your-turn', currentWord);
  
    // Tell others it's guessing time
    players.forEach(p => {
      if (p.id !== currentDrawer) {
        io.to(p.id).emit('guessing-time', {
          blanks: '_ '.repeat(currentWord.length).trim()
        });
      }
    });
  }
  
  socket.on('chat', (msg) => {
    if (!currentWord || guessedCorrectly) return;
  
    if (msg.toLowerCase().trim() === currentWord.toLowerCase()) {
      guessedCorrectly = true;
  
      // Notify everyone
      io.emit('correct-guess', {
        word: currentWord,
        guesser: socket.id,
      });
  
      // Wait a few seconds, then next round
      setTimeout(() => startNewRound(), 3000);
    } else {
      // Regular chat message
      socket.broadcast.emit('chat', {
        from: socket.id,
        message: msg
      });
    }
  });  

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
