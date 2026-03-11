const express = require('express');
const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { ensureObjectId, parseLimit } = require('../utils/helpers');

const router = express.Router();

router.get('/:userId', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.userId, 'User-ID')) return;

    const otherUser = await User.findById(req.params.userId).select('_id');
    if (!otherUser) return res.status(404).json({ message: 'Empfänger nicht gefunden' });

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

module.exports = router;