const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { ensureObjectId, parseLimit } = require('../utils/helpers');

const router = express.Router();

router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = parseLimit(req.query.limit, 15);

    if (!q) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: q, $options: 'i' }
    })
      .select('_id username role')
      .sort({ username: 1 })
      .limit(limit);

    res.json(users.map((entry) => ({
      id: entry._id,
      username: entry.username,
      role: entry.role
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// /me/posts muss vor /:id/posts stehen, damit Express nicht "me" als ID interpretiert
router.get('/me/posts', auth, async (req, res) => {
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

router.get('/:id/posts', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'User-ID')) return;

    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username role')
      .populate('forum', 'title tags')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;