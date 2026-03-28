const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const { verifyToken, extractToken } = require('./utils/jwt');

const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forums');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const mediaRoutes = require('./routes/media');
const setupSockets = require('./sockets/index');

const PORT = process.env.PORT || 5001;
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : true;
const socketOrigin = allowedOrigins === true ? '*' : allowedOrigins;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: socketOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// --- MIDDLEWARE ---
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --- DATENBANK VERBINDUNG ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Atlas verbunden'))
  .catch(err => console.error('Verbindungsfehler:', err));

// --- ROUTEN ---
app.get('/', (req, res) => res.send('CampusTalk Backend läuft!'));

app.use('/api/auth', authRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/private-messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);

// --- WEBSOCKETS ---
io.use((socket, next) => {
  try {
    const token = extractToken(
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers.authorization
    );

    if (!token) {
      return next(new Error('Authentifizierung erforderlich'));
    }

    socket.user = verifyToken(token);
    next();
  } catch (err) {
    next(new Error('Ungültiger Token'));
  }
});

setupSockets(io);

// --- SERVER START ---
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT} (mit WebSockets)`);
});