const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ReportSchema.index({ targetType: 1, targetId: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
