const express = require('express');
const router = express.Router();
const SolicitudCorreccionPerfil = require('../models/SolicitudCorreccionPerfil');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { verifyToken, isAdmin } = require('../middleware/auth');

// POST /api/perfil-correction — usuario crea solicitud de corrección
router.post('/api/perfil-correction', verifyToken, async (req, res) => {
  try {
    const { camposACorregir, justificacion } = req.body;
    if (!camposACorregir?.length || !justificacion) {
      return res.status(400).json({ message: 'Campos a corregir y justificación son requeridos' });
    }
    // Solo una solicitud activa a la vez
    const activa = await SolicitudCorreccionPerfil.findOne({
      usuarioId: req.user.id,
      estado: { $in: ['pendiente', 'aprobado'] }
    });
    if (activa) {
      return res.status(409).json({ message: 'Ya tienes una solicitud de corrección activa', solicitud: activa });
    }
    const user = await User.findById(req.user.id);
    const solicitud = await SolicitudCorreccionPerfil.create({
      usuarioId: req.user.id,
      camposACorregir,
      valorActual: { grado: user.grado, grupo: user.grupo, turno: user.turno, nombre: user.nombre },
      justificacion
    });
    res.status(201).json({ message: 'Solicitud de corrección enviada', solicitud });
  } catch (err) {
    console.error('Error al crear solicitud de corrección:', err);
    res.status(500).json({ message: 'Error al crear la solicitud' });
  }
});

// GET /api/perfil-correction — admin lista todas, usuario ve las suyas
router.get('/api/perfil-correction', verifyToken, async (req, res) => {
  try {
    const filtro = req.user.isAdmin ? {} : { usuarioId: req.user.id };
    const solicitudes = await SolicitudCorreccionPerfil.find(filtro)
      .populate('usuarioId', 'nombre email grado grupo turno picture')
      .populate('revisadoPor', 'nombre')
      .sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (err) {
    console.error('Error al obtener solicitudes de corrección:', err);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});

// PUT /api/perfil-correction/:id — admin aprueba o rechaza
router.put('/api/perfil-correction/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { estado, motivoRechazo } = req.body;
    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ message: 'Estado debe ser aprobado o rechazado' });
    }
    const solicitud = await SolicitudCorreccionPerfil.findById(req.params.id);
    if (!solicitud) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'pendiente') {
      return res.status(409).json({ message: 'La solicitud ya fue procesada' });
    }

    const update = { estado, revisadoPor: req.user.id };
    let mensaje;
    if (estado === 'aprobado') {
      update.fechaAprobacion = new Date();
      update.fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
      mensaje = 'Tu solicitud de corrección de perfil fue aprobada. Tienes 24 horas para editar tus datos.';
    } else {
      update.motivoRechazo = motivoRechazo || 'Sin motivo especificado';
      mensaje = `Tu solicitud de corrección de perfil fue rechazada. Motivo: ${update.motivoRechazo}`;
    }

    await SolicitudCorreccionPerfil.findByIdAndUpdate(req.params.id, update);
    await Notification.create({
      usuarioId: solicitud.usuarioId,
      mensaje,
      tipo: estado === 'aprobado' ? 'success' : 'warning',
      entidadId: solicitud._id,
      entidadTipo: 'SolicitudCorreccionPerfil'
    });

    res.json({ message: `Solicitud ${estado} correctamente` });
  } catch (err) {
    console.error('Error al procesar solicitud de corrección:', err);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Middleware: verifica ventana de corrección antes de PUT /update-user
// Exportado para uso externo desde userRoutes.js
const checkCorrectionWindow = async (req, res, next) => {
  try {
    const solicitud = await SolicitudCorreccionPerfil.findOne({
      usuarioId: req.user.id,
      estado: 'aprobado',
      fechaExpiracion: { $gt: new Date() }
    });
    if (!solicitud) {
      return res.status(403).json({
        message: 'No tienes una ventana de corrección activa. Solicita permiso al administrador.',
        codigoError: 'SIN_VENTANA_CORRECCION'
      });
    }
    req.correctionSolicitudId = solicitud._id;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error al verificar ventana de corrección' });
  }
};

module.exports = router;
module.exports.checkCorrectionWindow = checkCorrectionWindow;
