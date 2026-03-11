const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/helpers');

const router = express.Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email und Passwort sind erforderlich' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) return res.status(400).json({ message: 'User nicht gefunden' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Ungültige Zugangsdaten' });

    const token = createToken(user);

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
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

module.exports = router;