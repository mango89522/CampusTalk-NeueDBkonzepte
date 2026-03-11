const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

// Modelle importieren
const Post = require('./models/Post');
const User = require('./models/User');
const Forum = require('./models/Forum');
const Comment = require('./models/Comment');
const PrivateMessage = require('./models/PrivateMessage');
const Message = require('./models/Message'); // Das neue Modell

// Middleware importieren
const auth = require('./middleware/auth');
const { createToken, verifyToken, extractToken } = require('./utils/jwt');

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
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

// --- MIDDLEWARE ---
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --- DATENBANK VERBINDUNG ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas verbunden!'))
  .catch(err => console.error('❌ Verbindungsfehler:', err));

function isAdmin(user) {
  return user.role === 'Administrator';
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function ensureObjectId(res, id, label) {
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: `Ungültige ${label}` });
    return false;
  }

  return true;
}

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function canManageResource(user, ownerId) {
  return isAdmin(user) || String(ownerId) === String(user.id);
}

function parseLimit(limitValue, fallback = 100) {
  const parsedLimit = Number.parseInt(limitValue, 10);

  if (Number.isNaN(parsedLimit)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsedLimit, 200));
}

function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  comments.forEach((comment) => {
    const commentObject = comment.toObject();
    commentObject.replies = [];
    commentMap.set(String(commentObject._id), commentObject);
  });

  commentMap.forEach((comment) => {
    if (comment.parentComment) {
      const parent = commentMap.get(String(comment.parentComment));

      if (parent) {
        parent.replies.push(comment);
        return;
      }
    }

    rootComments.push(comment);
  });

  return rootComments;
}

async function deleteCommentThread(rootCommentId) {
  const commentIds = [];
  const queue = [rootCommentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    commentIds.push(currentId);

    const childComments = await Comment.find({ parentComment: currentId }).select('_id');
    queue.push(...childComments.map((comment) => comment._id));
  }

  await Comment.deleteMany({ _id: { $in: commentIds } });
  return commentIds.length;
}

async function deletePostWithRelations(postId) {
  await Comment.deleteMany({ post: postId });
  await Post.findByIdAndDelete(postId);
}

async function deleteForumWithRelations(forumId) {
  const postsInForum = await Post.find({ forum: forumId }).select('_id');
  const postIds = postsInForum.map((post) => post._id);

  if (postIds.length > 0) {
    await Comment.deleteMany({ post: { $in: postIds } });
  }

  await Post.deleteMany({ forum: forumId });
  await Message.deleteMany({ forum: forumId });
  await Forum.findByIdAndDelete(forumId);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Nur Administratoren dürfen das.' });
  }

  next();
}

// --- AUTH ROUTEN (Registrierung & Login) ---

// Registrierung
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, Email und Passwort sind erforderlich' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ message: 'Bitte eine gültige Email angeben' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email oder Username bereits vergeben' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({
      message: 'User erfolgreich erstellt!',
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email oder Username bereits vergeben' });
    }

    res.status(500).json({ message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email und Passwort sind erforderlich' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) return res.status(400).json({ message: "User nicht gefunden" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Ungültige Zugangsdaten" });

    const token = createToken(user);

    res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- ÖFFENTLICHE ROUTEN (Auch für Gäste) ---

// Test-Route
app.get('/', (req, res) => res.send('CampusTalk Backend läuft!'));

app.get('/api/forums', async (req, res) => {
  try {
    const { tag, search } = req.query;
    const moduleTag = req.query.module;
    const query = {};

    if (tag || moduleTag) {
      query.tags = tag || moduleTag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const forums = await Forum.find(query)
      .populate('creator', 'username role')
      .sort({ createdAt: -1 });

    res.json(forums);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/forums/:id', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) {
      return;
    }

    const forum = await Forum.findById(req.params.id).populate('creator', 'username role');

    if (!forum) {
      return res.status(404).json({ message: 'Forum nicht gefunden' });
    }

    res.json(forum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Alle Beiträge abrufen (mit Filter-Option für Tags)
// ROUTE: BEITRÄGE SUCHEN & FILTERN
app.get('/api/posts', async (req, res) => {
  try {
    const { tag, search, forumId, authorId } = req.query;
    const moduleTag = req.query.module;
    let query = {};

    // Filter nach Tag (z.B. ?tag=Mathe)
    if (tag || moduleTag) {
      query.tags = tag || moduleTag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (forumId) {
      if (!ensureObjectId(res, forumId, 'Forum-ID')) {
        return;
      }

      query.forum = forumId;
    }

    if (authorId) {
      if (!ensureObjectId(res, authorId, 'User-ID')) {
        return;
      }

      query.author = authorId;
    }

    const posts = await Post.find(query)
      .populate('author', 'username role')
      .populate('forum', 'title tags')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id).select('_id');

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'username role')
      .sort({ createdAt: 1 });

    res.json(buildCommentTree(comments));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/users/:id/posts', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'User-ID')) {
      return;
    }

    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username role')
      .populate('forum', 'title tags')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- GESCHÜTZTE ROUTEN (auth benötigt) ---

app.get('/api/users/me/posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id })
      .populate('author', 'username role')
      .populate('forum', 'title tags')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forum erstellen
app.post('/api/forums', auth, async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Ein Forum braucht einen Titel' });
    }

    const newForum = new Forum({
      title: title.trim(),
      description,
      tags: normalizeTags(tags),
      creator: req.user.id
    });

    const savedForum = await newForum.save();
    const populatedForum = await Forum.findById(savedForum._id).populate('creator', 'username role');

    res.status(201).json(populatedForum);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ein Forum mit diesem Titel existiert bereits' });
    }

    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/forums/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) {
      return;
    }

    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ message: 'Forum nicht gefunden' });
    }

    if (!canManageResource(req.user, forum.creator)) {
      return res.status(403).json({ message: 'Du darfst dieses Forum nicht bearbeiten' });
    }

    const { title, description, tags } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Der Forentitel darf nicht leer sein' });
      }

      forum.title = title.trim();
    }

    if (description !== undefined) {
      forum.description = description;
    }

    if (tags !== undefined) {
      forum.tags = normalizeTags(tags);
    }

    await forum.save();

    const populatedForum = await Forum.findById(forum._id).populate('creator', 'username role');
    res.json(populatedForum);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ein Forum mit diesem Titel existiert bereits' });
    }

    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/forums/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) {
      return;
    }

    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ message: 'Forum nicht gefunden' });
    }

    if (!canManageResource(req.user, forum.creator)) {
      return res.status(403).json({ message: 'Du darfst dieses Forum nicht löschen' });
    }

    await deleteForumWithRelations(forum._id);
    res.json({ message: 'Forum wurde gelöscht' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Beitrag in einem Forum erstellen
app.post('/api/posts', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, videoUrl, forumId, tags } = req.body;

    if (!title || !content || !forumId) {
      return res.status(400).json({ message: 'Titel, Inhalt und Forum sind erforderlich' });
    }

    if (!ensureObjectId(res, forumId, 'Forum-ID')) {
      return;
    }

    const forum = await Forum.findById(forumId).select('_id');

    if (!forum) {
      return res.status(404).json({ message: 'Forum nicht gefunden' });
    }

    const newPost = new Post({
      title: title.trim(),
      content: content.trim(),
      imageUrl,
      videoUrl,
      tags: normalizeTags(tags),
      author: req.user.id,
      forum: forumId
    });

    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/posts/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    if (!canManageResource(req.user, post.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Post nicht bearbeiten' });
    }

    const { title, content, imageUrl, videoUrl, forumId, tags } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Der Titel darf nicht leer sein' });
      }

      post.title = title.trim();
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({ message: 'Der Inhalt darf nicht leer sein' });
      }

      post.content = content.trim();
    }

    if (forumId !== undefined) {
      if (!ensureObjectId(res, forumId, 'Forum-ID')) {
        return;
      }

      const forum = await Forum.findById(forumId).select('_id');

      if (!forum) {
        return res.status(404).json({ message: 'Forum nicht gefunden' });
      }

      post.forum = forumId;
    }

    if (imageUrl !== undefined) {
      post.imageUrl = imageUrl;
    }

    if (videoUrl !== undefined) {
      post.videoUrl = videoUrl;
    }

    if (tags !== undefined) {
      post.tags = normalizeTags(tags);
    }

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    res.json(populatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ROUTE: KOMMENTAR ODER ANTWORT ERSTELLEN
app.post('/api/comments', auth, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: 'Inhalt und Post-ID sind erforderlich' });
    }

    if (!ensureObjectId(res, postId, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(postId).select('_id');

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    if (parentCommentId) {
      if (!ensureObjectId(res, parentCommentId, 'Kommentar-ID')) {
        return;
      }

      const parentComment = await Comment.findById(parentCommentId).select('post');

      if (!parentComment) {
        return res.status(404).json({ message: 'Übergeordneter Kommentar nicht gefunden' });
      }

      if (String(parentComment.post) !== String(postId)) {
        return res.status(400).json({ message: 'Antworten müssen im selben Post bleiben' });
      }
    }

    const newComment = new Comment({
      content: content.trim(),
      post: postId,
      author: req.user.id,
      parentComment: parentCommentId || null
    });

    const savedComment = await newComment.save();
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'username role');

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/comments/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Kommentar-ID')) {
      return;
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Kommentar nicht gefunden' });
    }

    if (!canManageResource(req.user, comment.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Kommentar nicht bearbeiten' });
    }

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Der Kommentarinhalt darf nicht leer sein' });
    }

    comment.content = content.trim();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate('author', 'username role');
    res.json(populatedComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/comments/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Kommentar-ID')) {
      return;
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Kommentar nicht gefunden' });
    }

    if (!canManageResource(req.user, comment.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Kommentar nicht löschen' });
    }

    const deletedComments = await deleteCommentThread(comment._id);

    res.json({
      message: 'Kommentar wurde gelöscht',
      deletedComments
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPVOTE
app.patch('/api/posts/:id/upvote', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    if (post.upvotes.some((id) => String(id) === String(userId))) {
      post.upvotes.pull(userId);
    } else {
      post.upvotes.push(userId);
      post.downvotes.pull(userId);
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
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    if (post.downvotes.some((id) => String(id) === String(userId))) {
      post.downvotes.pull(userId);
    } else {
      post.downvotes.push(userId);
      post.upvotes.pull(userId);
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
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) {
      return;
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post nicht gefunden' });
    }

    if (!canManageResource(req.user, post.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Post nicht löschen' });
    }

    await deletePostWithRelations(post._id);
    res.json({ message: "Post wurde gelöscht" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/forums/:forumId/messages', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.forumId, 'Forum-ID')) {
      return;
    }

    const forum = await Forum.findById(req.params.forumId).select('_id');

    if (!forum) {
      return res.status(404).json({ message: 'Forum nicht gefunden' });
    }

    const limit = parseLimit(req.query.limit, 100);
    const messages = await Message.find({ forum: req.params.forumId })
      .populate('sender', 'username role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/private-messages/:userId', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.userId, 'User-ID')) {
      return;
    }

    const otherUser = await User.findById(req.params.userId).select('_id');

    if (!otherUser) {
      return res.status(404).json({ message: 'Empfänger nicht gefunden' });
    }

    const limit = parseLimit(req.query.limit, 100);
    const messages = await PrivateMessage.find({
      $or: [
        { sender: req.user.id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.id }
      ]
    })
      .populate('sender recipient', 'username role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Einfache Admin-Verwaltung für Prio 1
app.get('/api/admin/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/admin/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'User-ID')) {
      return;
    }

    const { role } = req.body;
    const allowedRoles = ['Studierender', 'Administrator'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Ungültige Rolle' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden' });
    }

    user.role = role;
    await user.save();

    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Socket-Verbindungen nutzen denselben JWT wie die REST-API
io.use((socket, next) => {
  try {
    const token = extractToken(socket.handshake.auth?.token || socket.handshake.headers.authorization);

    if (!token) {
      return next(new Error('Authentifizierung erforderlich'));
    }

    socket.user = verifyToken(token);
    next();
  } catch (err) {
    next(new Error('Ungültiger Token'));
  }
});

io.on('connection', (socket) => {
  socket.join(String(socket.user.id));
  console.log('Ein User hat sich verbunden:', socket.id);

  // User tritt einem spezifischen Forum-Chatraum bei
  socket.on('join_forum', async (forumId) => {
    try {
      if (!isValidObjectId(forumId)) {
        return socket.emit('socket_error', { message: 'Ungültige Forum-ID' });
      }

      const forum = await Forum.findById(forumId).select('_id');

      if (!forum) {
        return socket.emit('socket_error', { message: 'Forum nicht gefunden' });
      }

      socket.join(String(forumId));
      console.log(`User ${socket.id} ist Raum ${forumId} beigetreten`);
    } catch (err) {
      socket.emit('socket_error', { message: 'Forum konnte nicht betreten werden' });
    }
  });

  // Nachricht empfangen und senden
  socket.on('send_message', async (data) => {
    try {
      const { forumId, text } = data || {};

      if (!text || !text.trim() || !isValidObjectId(forumId)) {
        return socket.emit('socket_error', { message: 'Forum oder Nachricht ungültig' });
      }

      const forum = await Forum.findById(forumId).select('_id');

      if (!forum) {
        return socket.emit('socket_error', { message: 'Forum nicht gefunden' });
      }

      const newMessage = new Message({
        forum: forumId,
        sender: socket.user.id,
        text: text.trim()
      });

      await newMessage.save();

      io.to(String(forumId)).emit('receive_message', {
        id: newMessage._id,
        forumId,
        text: newMessage.text,
        senderId: socket.user.id,
        senderUsername: socket.user.username,
        createdAt: newMessage.createdAt
      });
    } catch (err) {
      console.error('Forum-Chat Fehler:', err);
      socket.emit('socket_error', { message: 'Nachricht konnte nicht gesendet werden' });
    }
  });

  socket.on('register_private', () => {
    socket.join(String(socket.user.id));
    console.log(`User ${socket.user.id} ist bereit für private Nachrichten.`);
  });

  // Private Nachricht senden
  socket.on('send_private_message', async (data) => {
    try {
      const { recipientId, text } = data || {};

      if (!text || !text.trim() || !isValidObjectId(recipientId)) {
        return socket.emit('socket_error', { message: 'Empfänger oder Nachricht ungültig' });
      }

      const recipient = await User.findById(recipientId).select('_id username');

      if (!recipient) {
        return socket.emit('socket_error', { message: 'Empfänger nicht gefunden' });
      }

      const newMessage = new PrivateMessage({
        sender: socket.user.id,
        recipient: recipientId,
        text: text.trim()
      });

      await newMessage.save();

      io.to(String(recipientId)).to(String(socket.user.id)).emit('receive_private_message', {
        id: newMessage._id,
        senderId: socket.user.id,
        senderUsername: socket.user.username,
        recipientId,
        text: newMessage.text,
        createdAt: newMessage.createdAt
      });
    } catch (err) {
      console.error("Privat-Chat Fehler:", err);
      socket.emit('socket_error', { message: 'Private Nachricht konnte nicht gesendet werden' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User hat die Verbindung getrennt');
  });
});

// --- SERVER START ---
server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT} (mit WebSockets)`);
});