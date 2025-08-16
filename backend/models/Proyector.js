const mongoose = require('mongoose');

const proyectorSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true
  },
  grado: {
    type: Number,
    required: true
  },
  grupo: {
    type: String,
    required: true
  },
  turno: {
    type: String,
    enum: ['Matutino', 'Vespertino'],
    required: true
  },
  estado: {
    type: String,
    enum: ['disponible', 'en uso', 'devuelto'],
    default: 'disponible'
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Agregar índice único compuesto para grado, grupo y turno
proyectorSchema.index({ grado: 1, grupo: 1, turno: 1 }, { unique: true });

module.exports = mongoose.model('Proyector', proyectorSchema); 