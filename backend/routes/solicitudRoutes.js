const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const Solicitud = require('../models/Solicitud');
const Proyector = require('../models/Proyector');
const ProyectorComment = require('../models/ProyectorComment');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/solicitudes', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Acceso denegado. Se requieren permisos de administrador.',
        userInfo: { email: req.user.email, isAdmin: req.user.isAdmin }
      });
    }

    const solicitudes = await Solicitud.find()
      .populate('usuarioId')
      .populate('proyectorId')
      .sort({ fechaInicio: -1 });

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes', error: error.message });
  }
});

router.get('/solicitudes/id/:id', verifyToken, async (req, res) => {
  try {
    const solicitud = await Solicitud.findById(req.params.id)
      .populate('usuarioId')
      .populate('proyectorId');

    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json(solicitud);
  } catch (error) {
    console.error('Error al obtener solicitud por ID:', error);
    res.status(500).json({ message: 'Error al obtener la solicitud' });
  }
});

router.post('/solicitar-proyector', verifyToken, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, motivo, eventId, grado, grupo, turno, telefono } = req.body;
    const usuarioId = req.user.id;

    if (!fechaInicio || !fechaFin || !motivo || !eventId) {
      return res.status(400).json({
        message: 'Los campos fechaInicio, fechaFin, motivo y eventId son requeridos',
        camposRecibidos: { fechaInicio: !!fechaInicio, fechaFin: !!fechaFin, motivo: !!motivo, eventId: !!eventId }
      });
    }

    const proyectorId = new mongoose.Types.ObjectId('650000000000000000000001');

    const nuevaSolicitud = new Solicitud({
      usuarioId: new mongoose.Types.ObjectId(usuarioId),
      proyectorId,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      motivo,
      eventId,
      grado: grado || null,
      grupo: grupo || null,
      turno: turno || null,
      estado: 'pendiente'
    });

    const solicitudGuardada = await nuevaSolicitud.save();
    const solicitudConUsuario = await solicitudGuardada.populate('usuarioId');

    if (process.env.N8N_WEBHOOK_URL && telefono) {
      try {
        const fechaFormateada = `${new Date(fechaInicio).toLocaleDateString('es-MX')} - ${new Date(fechaFin).toLocaleDateString('es-MX')}`;
        await axios.post(process.env.N8N_WEBHOOK_URL, {
          nombre: solicitudConUsuario.usuarioId.nombre,
          fecha: fechaFormateada,
          hora: turno || 'No especificado',
          semestre: grado ? `${grado}º Semestre` : 'No especificado',
          telefono: `+521${telefono}`
        });
      } catch (n8nError) {
        console.error('Error al enviar la notificación a N8N:', n8nError.message);
      }
    }

    res.status(201).json({ message: 'Solicitud creada exitosamente', solicitud: solicitudConUsuario });
  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({
      message: 'Error al procesar la solicitud',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put('/solicituds/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, proyectorId } = req.body;

    const estadosPermitidos = ['pendiente', 'aprobado', 'rechazado', 'finalizado'];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado no válido. Debe ser: pendiente, aprobado, rechazado o finalizado' });
    }

    const solicitudActualizada = await Solicitud.findByIdAndUpdate(id, { estado, proyectorId }, { new: true });

    if (!solicitudActualizada) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    res.json({ message: 'Estado actualizado correctamente', solicitud: solicitudActualizada });
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ message: 'Error al actualizar solicitud' });
  }
});

router.put('/solicituds/:id/comments-added', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (solicitud.usuarioId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para modificar esta solicitud' });
    }

    const solicitudActualizada = await Solicitud.findByIdAndUpdate(
      id,
      { hasComments: true, commentsAdded: true },
      { new: true }
    );

    res.json({ message: 'Comentarios marcados como agregados', solicitud: solicitudActualizada });
  } catch (error) {
    console.error('Error al marcar comentarios como agregados:', error);
    res.status(500).json({ message: 'Error al actualizar solicitud' });
  }
});

router.get('/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({ usuarioId: req.user.id })
      .sort({ createdAt: -1 })
      .select('_id motivo fechaInicio fechaFin estado')
      .lean();

    res.json(solicitudes || []);
  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes', error: error.message });
  }
});

router.get('/api/mis-solicitudes', verifyToken, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({ usuarioId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('proyectorId', 'nombre codigo')
      .select('materia profesor salon fechaInicio fechaFin estado motivo comentarios')
      .lean();

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});

router.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const solicitudesUsuario = await Solicitud.find({ usuarioId: userId });

    const stats = {
      solicitudesActivas: solicitudesUsuario.filter(s => s.estado === 'aprobado').length,
      misSolicitudes: solicitudesUsuario.length,
      proyectoresDisponibles: await Proyector.countDocuments({ estado: 'disponible' }),
      solicitudesPendientes: solicitudesUsuario.filter(s => s.estado === 'pendiente').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
});

module.exports = router;
