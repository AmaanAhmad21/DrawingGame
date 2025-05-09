const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const usernames = {}; // socket.id -> username
const fs = require('fs');
const wordsFilePath = path.join(__dirname, 'words.json');
let words = [];

fs.readFile(wordsFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error("Failed to load words.json:", err);
  } else {
    const parsedData = JSON.parse(data);
    words = parsedData.words;
    console.log(`✅ Loaded ${words.length} words from words.json`);
  }
});

let players = [];
let currentDrawer = null;
let currentWord = '';
let guessedCorrectly = false;
let mainTimer;
let countdownTimer;

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

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

  socket.on('draw', (data) => {
    if (socket.id === currentDrawer) {
      socket.broadcast.emit('draw', data);
    }
  });

  socket.on('clear-board', () => {
    if (socket.id === currentDrawer) {
      io.emit('clear-board');
    }
  });

  socket.on('chat', (msg) => {
    if (!currentWord || guessedCorrectly) return;

    const sender = usernames[socket.id] || socket.id;

    if (msg.toLowerCase().trim() === currentWord.toLowerCase()) {
      guessedCorrectly = true;

      io.emit('correct-guess', {
        word: currentWord,
        guesser: sender
      });

      // ✅ Clear the main game timer before starting the 5-second wait
      clearInterval(mainTimer);
      startCooldown();
    } else {
      io.emit('chat', {
        from: sender,
        message: msg
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  
    const username = usernames[socket.id];
    
    // Remove the player from the list
    players = players.filter(id => id !== socket.id);
    delete usernames[socket.id];
  
    // If there are still enough players
    if (players.length >= 2) {
      io.emit('chat', {
        from: "Server",
        message: `${username} has disconnected.`
      });
  
      // If the disconnected player was the drawer, pick a new drawer
      if (socket.id === currentDrawer) {
        guessedCorrectly = true;
        setTimeout(() => startNewRound(), 1000);
      }
    } else {
      // If fewer than 2 players are left, end the game
      io.emit('chat', {
        from: "Server",
        message: "Not enough players. Waiting for more to join..."
      });
      
      io.emit('clear-board'); // Clear the board
      clearInterval(mainTimer); // Stop the main timer if it's running
      clearInterval(countdownTimer); // Stop the 5-second countdown if it's running
      
      // Set the game state to idle
      currentDrawer = null;
      currentWord = '';
      guessedCorrectly = true; // Stop any guessing
  
      io.emit('game-ended'); // Inform all clients
    }
  });  
});

// ✅ Start new round function
function startNewRound() {
  guessedCorrectly = false;

  if (players.length < 2) return;

  io.emit('clear-board');

  currentDrawer = players[Math.floor(Math.random() * players.length)];
  currentWord = words[Math.floor(Math.random() * words.length)];

  console.log(`🎮 New round: Drawer is ${usernames[currentDrawer]}, Word is "${currentWord}"`);

  io.to(currentDrawer).emit('your-turn', currentWord);

  players.forEach(id => {
    if (id !== currentDrawer) {
      io.to(id).emit('guessing-time', '_ '.repeat(currentWord.length).trim());
    }
  });

  // ✅ Start a timer for the round
  let timer = 120; // 2 minutes for the round
  mainTimer = setInterval(() => {
    io.emit('round-timer', timer);

    if (timer === 0) {
      clearInterval(mainTimer);
      io.emit('no-guess', currentWord); // 👈 Announce no one guessed
      startCooldown(); // 👈 Trigger the cooldown before the next round
    }

    timer--;
  }, 1000);
}

// ✅ New 5-second countdown function
function startCooldown() {
  let countdown = 5;
  io.emit('clear-board');
  
  countdownTimer = setInterval(() => {
    io.emit('round-countdown', countdown);

    if (countdown === 0) {
      clearInterval(countdownTimer);
      io.emit('round-countdown', null); // Clear on client
      startNewRound(); // 🔁 Round actually starts here
    }
    countdown--;
  }, 1000);
}

const PORT = 3000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
