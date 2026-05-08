// src/index.js — SafePit Backend Server
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const { Server } = require('socket.io');
const { testConnection } = require('./config/db');

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });

// Make io available in controllers via req.app.get('io')
app.set('io', io);

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

io.on('connection', (socket) => {
  // Client must emit join_room with their role after connecting
  socket.on('join_room', (role) => {
    if (role === 'supervisor' || role === 'admin') {
      socket.join('supervisor');
      console.log(`Socket ${socket.id} joined supervisor room`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/checklist', require('./routes/checklist'));
app.use('/api/sos',       require('./routes/sos'));
app.use('/api/reports',   require('./routes/report'));
app.use('/api/content',   require('./routes/content'));

// Health check
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', app: 'SafePit', time: new Date() })
);

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: `${req.method} ${req.path} not found.` })
);

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('⛏️  SafePit Backend Running');
    console.log(`🌐  http://localhost:${PORT}`);
    console.log(`❤️   http://localhost:${PORT}/api/health`);
    console.log('');
  });
}

start();
