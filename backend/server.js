const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Modelle importieren
const Post = require('./models/Post');
const User = require('./models/User');
const Forum = require('./models/Forum');
const Comment = require('./models/Comment');
const PrivateMessage = require('./models/PrivateMessage');

const http = require('http'); // Neu
const { Server } = require('socket.io'); // Neu
const PORT = process.env.PORT || 5001;
const Message = require('./models/Message'); // Das neue Modell

// Middleware importieren
const auth = require('./middleware/auth');

const app = express();
const server = http.createServer(app); // Wickelt Express ein
const io = new Server(server, {
  cors: {
    origin: "*", // Erlaubt Verbindungen von überall (für die Entwicklung)
    methods: ["GET", "POST"]
  }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATENBANK VERBINDUNG ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas verbunden!'))
  .catch(err => console.error('❌ Verbindungsfehler:', err));

// --- AUTH ROUTEN (Registrierung & Login) ---

// Registrierung
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email bereits vergeben" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User erfolgreich erstellt!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User nicht gefunden" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Ungültige Zugangsdaten" });

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      "DEIN_GEHEIMES_WORT", 
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ÖFFENTLICHE ROUTEN (Auch für Gäste) ---

// Test-Route
app.get('/', (req, res) => res.send('CampusTalk Backend läuft!'));

// Alle Beiträge abrufen (mit Filter-Option für Tags)
// ROUTE: BEITRÄGE SUCHEN & FILTERN
app.get('/api/posts', async (req, res) => {
  try {
    const { tag, search } = req.query;
    let query = {};

    // Filter nach Tag (z.B. ?tag=Mathe)
    if (tag) {
      query.tags = tag;
    }

    // Suche nach Text im Titel (z.B. ?search=Bücher)
    // 'i' bedeutet "case insensitive" (Groß-/Kleinschreibung egal)
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const posts = await Post.find(query)
      .populate('author', 'username') // Holt direkt den Namen des Autors mit!
      .populate('forum', 'title')    // Holt den Namen des Forums mit!
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- GESCHÜTZTE ROUTEN (auth benötigt) ---

// Forum erstellen
app.post('/api/forums', auth, async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    const newForum = new Forum({
      title,
      description,
      tags,
      creator: req.user.id
    });
    const savedForum = await newForum.save();
    res.status(201).json(savedForum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Beitrag in einem Forum erstellen
app.post('/api/posts', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, forumId, tags } = req.body;
    const newPost = new Post({
      title,
      content,
      imageUrl,
      tags,
      author: req.user.id,
      forum: forumId
    });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ROUTE: KOMMENTAR ODER ANTWORT ERSTELLEN
app.post('/api/comments', auth, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    const newComment = new Comment({
      content,
      post: postId,
      author: req.user.id,
      parentComment: parentCommentId || null // Wenn keine ID mitkommt, ist es ein Hauptkommentar
    });

    const savedComment = await newComment.save();
    res.status(201).json(savedComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPVOTE
app.patch('/api/posts/:id/upvote', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (post.upvotes.includes(userId)) {
      post.upvotes.pull(userId); // Toggle: Wenn schon upgevoted, dann zurücknehmen
    } else {
      post.upvotes.push(userId); // Upvote hinzufügen
      post.downvotes.pull(userId); // Sicherstellen, dass kein Downvote existiert
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DOWNVOTE
app.patch('/api/posts/:id/downvote', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (post.downvotes.includes(userId)) {
      post.downvotes.pull(userId); // Toggle
    } else {
      post.downvotes.push(userId);
      post.upvotes.pull(userId); // Upvote entfernen, falls vorhanden
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Löschen eines Posts (geschützt)
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post wurde gelöscht" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Ein User hat sich verbunden:', socket.id);

  // User tritt einem spezifischen Forum-Chatraum bei
  socket.on('join_forum', (forumId) => {
    socket.join(forumId);
    console.log(`User ${socket.id} ist Raum ${forumId} beigetreten`);
  });

  // Nachricht empfangen und senden
  socket.on('send_message', async (data) => {
    const { forumId, senderId, text } = data;

    // 1. Nachricht in Datenbank speichern
    const newMessage = new Message({ forum: forumId, sender: senderId, text });
    await newMessage.save();

    // 2. Nachricht an alle im selben Forum-Raum schicken
    io.to(forumId).emit('receive_message', {
      text,
      senderId,
      createdAt: newMessage.createdAt
    });
  });

  socket.on('disconnect', () => {
    console.log('User hat die Verbindung getrennt');
  });

  // Ein User meldet sich mit seiner ID an, um private Nachrichten zu empfangen
  socket.on('register_private', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} ist bereit für private Nachrichten.`);
  });

  // Private Nachricht senden
  socket.on('send_private_message', async (data) => {
    try {
      const { senderId, recipientId, text } = data;

      // 1. In DB speichern
      const newMessage = new PrivateMessage({
        sender: senderId,
        recipient: recipientId,
        text
      });
      await newMessage.save();

      // 2. Nur an den Empfänger (und den Sender selbst für die Anzeige) senden
      io.to(recipientId).to(senderId).emit('receive_private_message', {
        senderId,
        text,
        createdAt: newMessage.createdAt
      });
    } catch (err) {
      console.error("Privat-Chat Fehler:", err);
    }
  });
});

// --- SERVER START ---
server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT} (mit WebSockets)`);
});