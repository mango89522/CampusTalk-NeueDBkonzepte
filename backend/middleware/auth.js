const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Den Token aus dem Header holen (Authorization: Bearer <TOKEN>)
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: "Kein Token, Zugriff verweigert" });
  }

  const token = authHeader.split(' ')[1]; // Entfernt "Bearer "

  try {
    const decoded = jwt.verify(token, "DEIN_GEHEIMES_WORT");
    req.user = decoded; // Fügt die User-Daten (ID und Rolle) dem Request hinzu
    next(); // Weiter geht's zur eigentlichen Route
  } catch (err) {
    res.status(401).json({ message: "Token ist nicht gültig" });
  }
};