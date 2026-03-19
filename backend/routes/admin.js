const express = require('express');
const User = require('../models/User');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { ensureObjectId, sanitizeUser } = require('../utils/helpers');

const router = express.Router();

router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'User-ID')) return;

    const { role } = req.body;
    const allowedRoles = ['Studierender', 'Administrator'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Ungültige Rolle' });
    }

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'User nicht gefunden' });

    user.role = role;
    await user.save();

    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports', auth, requireAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username role')
      .sort({ createdAt: -1 })
      .limit(400);

    const postIds = reports
      .filter((entry) => entry.targetType === 'post')
      .map((entry) => entry.targetId);
    const commentIds = reports
      .filter((entry) => entry.targetType === 'comment')
      .map((entry) => entry.targetId);

    const [posts, comments] = await Promise.all([
      Post.find({ _id: { $in: postIds } })
        .populate('author', 'username role')
        .populate('forum', 'title')
        .select('title content author forum createdAt'),
      Comment.find({ _id: { $in: commentIds } })
        .populate('author', 'username role')
        .populate('post', 'title')
        .select('content author post createdAt')
    ]);

    const postMap = new Map(posts.map((entry) => [String(entry._id), entry]));
    const commentMap = new Map(comments.map((entry) => [String(entry._id), entry]));

    const result = reports.map((entry) => {
      const target = entry.targetType === 'post'
        ? postMap.get(String(entry.targetId))
        : commentMap.get(String(entry.targetId));

      return {
        id: entry._id,
        targetType: entry.targetType,
        targetId: entry.targetId,
        reason: entry.reason,
        reporter: entry.reporter,
        createdAt: entry.createdAt,
        target
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;