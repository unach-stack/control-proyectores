const mongoose = require('mongoose');

const proyectorCommentSchema = new mongoose.Schema({
  solicitudId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Solicitud',
    required: true
  },
  proyectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proyector',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issues: [{
    type: String,
    enum: ['hdmi', 'power', 'image', 'sound', 'overheat', 'remote', 'focus', 'other']
  }],
  comments: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProyectorComment', proyectorCommentSchema);
