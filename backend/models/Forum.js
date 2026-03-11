const mongoose = require('mongoose');

const ForumSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Verknüpfung zum User
  tags: [String], // Einfache Liste von Strings für die Filter-Funktion
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Forum', ForumSchema);