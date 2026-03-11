const { extractToken, verifyToken } = require('../utils/jwt');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  // Den Token aus dem Header holen (Authorization: Bearer <TOKEN>)
  const authHeader = req.header('Authorization');

  const token = extractToken(authHeader);

  if (!token) {
    return res.status(401).json({ message: "Kein Token, Zugriff verweigert" });
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('username email role');

    if (!user) {
      return res.status(401).json({ message: 'User zum Token wurde nicht gefunden' });
    }

    // Rolle aus der DB priorisieren, damit Änderungen sofort greifen.
    req.user = {
      id: decoded.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    next(); // Weiter geht's zur eigentlichen Route
  } catch (err) {
    res.status(401).json({ message: "Token ist nicht gültig" });
  }
};