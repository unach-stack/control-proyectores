const mongoose = require('mongoose');

const solicitudCorreccionPerfilSchema = new mongoose.Schema({
  usuarioId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  camposACorregir: [{ type: String, enum: ['grado', 'grupo', 'turno', 'nombre'] }],
  valorActual:     { type: Object },
  justificacion:   { type: String, required: true, maxlength: 500 },
  estado:          { type: String, enum: ['pendiente', 'aprobado', 'rechazado', 'completado'], default: 'pendiente' },
  fechaAprobacion: { type: Date, default: null },
  fechaExpiracion: { type: Date, default: null },
  revisadoPor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  motivoRechazo:   { type: String, default: null }
}, { timestamps: true });

// Un usuario solo puede tener UNA solicitud activa a la vez
solicitudCorreccionPerfilSchema.index({ usuarioId: 1, estado: 1 });

module.exports = mongoose.model('SolicitudCorreccionPerfil', solicitudCorreccionPerfilSchema);
