const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Wird später verschlüsselt!
  role: { 
    type: String, 
    enum: ['Studierender', 'Administrator'], 
    default: 'Studierender' 
  },
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Forum' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);