const express = require('express');
const User = require('../models/User');
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

module.exports = router;