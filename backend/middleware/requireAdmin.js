const { isAdmin } = require('../utils/helpers');

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Nur Administratoren dürfen das.' });
  }

  next();
}

module.exports = requireAdmin;
