const mongoose = require('mongoose');

const solicitudSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proyectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proyector'
  },
  motivo: {
    type: String,
    required: true
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado', 'devuelto'],
    default: 'pendiente'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Solicitud', solicitudSchema);