const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'DEIN_GEHEIMES_WORT';

function createToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function extractToken(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  if (value.startsWith('Bearer ')) {
    return value.split(' ')[1] || null;
  }

  return value;
}

module.exports = {
  createToken,
  verifyToken,
  extractToken
};