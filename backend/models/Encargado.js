const mongoose = require('mongoose');

const encargadoSchema = new mongoose.Schema({
  usuarioId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grado:        { type: String, required: true },
  grupo:        { type: String, required: true },
  turno:        { type: String, required: true },
  semana:       { type: String, required: true }, // formato "YYYY-Www" ej: "2026-W13"
  tipo:         { type: String, enum: ['titular', 'provisional'], default: 'titular' },
  estado:       { type: String, enum: ['postulado', 'activo', 'inactivo', 'sustituido'], default: 'postulado' },
  aprobadoPor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaInicio:  { type: Date },
  fechaFin:     { type: Date },
  noSePresento: { type: Boolean, default: false },
  sustituidoPor:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

encargadoSchema.index({ grado: 1, grupo: 1, turno: 1, semana: 1 });
encargadoSchema.index({ usuarioId: 1, semana: 1 });

module.exports = mongoose.model('Encargado', encargadoSchema);
