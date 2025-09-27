const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  tipo: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'comment_request'],
    default: 'info'
  },
  leida: {
    type: Boolean,
    default: false
  },
  entidadId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  entidadTipo: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema); 