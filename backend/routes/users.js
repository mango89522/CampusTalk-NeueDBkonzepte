const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { ensureObjectId } = require('../utils/helpers');

const router = express.Router();

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