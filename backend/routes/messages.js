const express = require('express');
const mongoose = require('mongoose');
const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { ensureObjectId, parseLimit } = require('../utils/helpers');

const router = express.Router();

router.get('/conversations', auth, async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100);
    const currentUserId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await PrivateMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId }
          ]
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              { $eq: ['$sender', currentUserId] },
              '$recipient',
              '$sender'
            ]
          },
          isUnreadForCurrent: {
            $and: [
              { $eq: ['$recipient', currentUserId] },
              { $eq: ['$readAt', null] }
            ]
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: ['$isUnreadForCurrent', 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          user: {
            id: '$user._id',
            username: '$user.username',
            role: '$user.role'
          },
          unreadCount: 1,
          lastMessage: {
            id: '$lastMessage._id',
            text: '$lastMessage.text',
            sender: '$lastMessage.sender',
            recipient: '$lastMessage.recipient',
            createdAt: '$lastMessage.createdAt',
            readAt: '$lastMessage.readAt'
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: limit }
    ]);

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

    await PrivateMessage.updateMany(
      {
        sender: req.params.userId,
        recipient: req.user.id,
        readAt: null
      },
      {
        $set: { readAt: new Date() }
      }
    );

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;