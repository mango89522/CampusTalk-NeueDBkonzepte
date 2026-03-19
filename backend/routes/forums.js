const express = require('express');
const Forum = require('../models/Forum');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  ensureObjectId,
  normalizeTags,
  canManageResource,
  deleteForumWithRelations,
  parseLimit
} = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
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

router.get('/:id', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) return;

    const forum = await Forum.findById(req.params.id).populate('creator', 'username role');

    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

    res.json(forum);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
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

router.patch('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) return;

    const forum = await Forum.findById(req.params.id);

    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

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

    if (description !== undefined) forum.description = description;
    if (tags !== undefined) forum.tags = normalizeTags(tags);

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

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) return;

    const forum = await Forum.findById(req.params.id);

    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

    if (!canManageResource(req.user, forum.creator)) {
      return res.status(403).json({ message: 'Du darfst dieses Forum nicht löschen' });
    }

    await deleteForumWithRelations(forum._id);
    res.json({ message: 'Forum wurde gelöscht' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) return;

    const forum = await Forum.findById(req.params.id).select('_id');
    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { subscriptions: forum._id }
    });

    res.json({ message: 'Forum wurde abonniert', forumId: forum._id, subscribed: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/subscribe', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Forum-ID')) return;

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { subscriptions: req.params.id }
    });

    res.json({ message: 'Forum wurde deabonniert', forumId: req.params.id, subscribed: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:forumId/messages', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.forumId, 'Forum-ID')) return;

    const forum = await Forum.findById(req.params.forumId).select('_id');

    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

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

module.exports = router;