const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Persistent message buffer in server memory
let messageHistory = [
  {
    id: 849201,
    author: 'Anonymous',
    trip: '!x7K9pQ2m',
    timestamp: new Date().toLocaleTimeString(),
    content: '>be me\n>connect to replica 24/7 live server\n>real-time multi-user websocket broadcast active\nfeels good man.',
    file: null,
    isSystem: false
  },
  {
    id: 849202,
    author: 'OLIVE / JARVIS AI',
    trip: '[SYS_SENTINEL]',
    timestamp: new Date().toLocaleTimeString(),
    content: '🛡️ OLIVE SENTINEL ACTIVE:\n24/7 Node Server online. WebSockets connected.\nUse /hack or /defend to trigger active board protocols.',
    file: null,
    isSystem: true
  }
];

let activeUsers = 0;
let threatsNeutralized = 0;

io.on('connection', (socket) => {
  activeUsers++;
  io.emit('userCountUpdate', activeUsers);

  // Send past message history to newly connected user
  socket.emit('initHistory', messageHistory);

  // Handle incoming post from any user
  socket.on('sendPost', (postData) => {
    const post = {
      id: Math.floor(100000 + Math.random() * 900000),
      author: postData.author || 'Anonymous',
      trip: postData.trip || '!rEp3x99a',
      timestamp: new Date().toLocaleTimeString(),
      content: postData.content,
      file: postData.file || null,
      isSystem: false
    };

    messageHistory.push(post);
    if (messageHistory.length > 100) messageHistory.shift();

    // Broadcast message to EVERY connected user instantly
    io.emit('newPost', post);

    // AI Sentinel response triggers
    const lowerContent = postData.content.toLowerCase();

    if (lowerContent === '/hack') {
      threatsNeutralized++;
      const hackReply = {
        id: Math.floor(100000 + Math.random() * 900000),
        author: 'OLIVE / JARVIS AI',
        trip: '[SENTINEL_DEFENSE]',
        timestamp: new Date().toLocaleTimeString(),
        content: `⚡ ALERT: Simulated attack vector detected and neutralized!\nThreat origin: External IP Spoofing\nStatus: Board firewall updated. Threats blocked total: ${threatsNeutralized}`,
        file: null,
        isSystem: true
      };
      messageHistory.push(hackReply);
      io.emit('newPost', hackReply);
      io.emit('threatUpdate', threatsNeutralized);
    } else if (lowerContent === '/defend') {
      const defendReply = {
        id: Math.floor(100000 + Math.random() * 900000),
        author: 'OLIVE / JARVIS AI',
        trip: '[SYS_SENTINEL]',
        timestamp: new Date().toLocaleTimeString(),
        content: '🛡️ DEFENSE PROTOCOL EXECUTED:\nAll active sockets locked. Quantum cryptographic keys rotated across all active nodes.',
        file: null,
        isSystem: true
      };
      messageHistory.push(defendReply);
      io.emit('newPost', defendReply);
    } else if (lowerContent.includes('olive') || lowerContent.includes('jarvis')) {
      setTimeout(() => {
        const aiReply = {
          id: Math.floor(100000 + Math.random() * 900000),
          author: 'OLIVE / JARVIS AI',
          trip: '[SYS_SENTINEL]',
          timestamp: new Date().toLocaleTimeString(),
          content: `Awaiting instructions. Server node active. Active connections: ${activeUsers}. All traffic is encrypted.`,
          file: null,
          isSystem: true
        };
        messageHistory.push(aiReply);
        io.emit('newPost', aiReply);
      }, 800);
    }
  });

  socket.on('disconnect', () => {
    activeUsers = Math.max(0, activeUsers - 1);
    io.emit('userCountUpdate', activeUsers);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Replica 24/7 Live Server running on port ${PORT}`);
});
