const express = require('express');
const User = require('../models/User');
const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Forum = require('../models/Forum');
const Message = require('../models/Message');
const PrivateMessage = require('../models/PrivateMessage');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { ensureObjectId, sanitizeUser, deletePostWithRelations } = require('../utils/helpers');

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

    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: 'Eigene Rolle kann nicht geändert werden' });
    }

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

router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'User-ID')) return;

    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: 'Eigener Account kann nicht gelöscht werden' });
    }

    const userToDelete = await User.findById(req.params.id).select('_id role username');

    if (!userToDelete) {
      return res.status(404).json({ message: 'User nicht gefunden' });
    }

    if (userToDelete.role !== 'Studierender') {
      return res.status(403).json({ message: 'Nur Studierende können gelöscht werden' });
    }

    const postsByUser = await Post.find({ author: userToDelete._id }).select('_id');
    const postIds = postsByUser.map((entry) => entry._id);

    await Promise.all(postsByUser.map((entry) => deletePostWithRelations(entry._id)));

    const commentsByUser = await Comment.find({ author: userToDelete._id }).select('_id');
    const commentIds = commentsByUser.map((entry) => entry._id);
    await Comment.deleteMany({ author: userToDelete._id });

    await Post.updateMany(
      {},
      {
        $pull: {
          upvotes: userToDelete._id,
          downvotes: userToDelete._id
        }
      }
    );

    await Forum.updateMany({ creator: userToDelete._id }, { $set: { creator: null } });

    await Promise.all([
      Message.deleteMany({ sender: userToDelete._id }),
      PrivateMessage.deleteMany({
        $or: [{ sender: userToDelete._id }, { recipient: userToDelete._id }]
      }),
      Report.deleteMany({
        $or: [
          { reporter: userToDelete._id },
          { targetType: 'post', targetId: { $in: postIds } },
          { targetType: 'comment', targetId: { $in: commentIds } }
        ]
      })
    ]);

    await User.findByIdAndDelete(userToDelete._id);

    res.json({
      message: `Studierender ${userToDelete.username} wurde gelöscht`,
      deletedUserId: String(userToDelete._id)
    });
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