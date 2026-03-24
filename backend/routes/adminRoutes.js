const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Solicitud = require('../models/Solicitud');
const Proyector = require('../models/Proyector');
const { verifyToken, isAdmin } = require('../middleware/auth');
const ADMIN_EMAILS = require('../config/adminEmails');

router.get('/api/admin-emails', (req, res) => {
  try {
    res.json({ adminEmails: ADMIN_EMAILS });
  } catch (error) {
    console.error('Error al obtener correos de administradores:', error);
    res.status(500).json({ message: 'Error al obtener correos de administradores', error: error.message });
  }
});

router.get('/admin/usuarios', verifyToken, isAdmin, async (req, res) => {
  try {
    const usuarios = await User.find();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
});

router.get('/admin/solicitudes', verifyToken, isAdmin, async (req, res) => {
  try {
    const solicitudes = await Solicitud.find().populate('usuarioId', 'nombre email');
    res.status(200).json(solicitudes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las solicitudes', error });
  }
});

router.get('/api/reports', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, estado, turno } = req.query;

    let matchFilter = {
      fechaInicio: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (estado && estado !== 'todos') {
      matchFilter.estado = estado;
    }

    const solicitudes = await Solicitud.find(matchFilter)
      .populate('usuarioId', 'nombre email grado grupo turno')
      .populate('proyectorId', 'codigo estado');

    let solicitudesFiltradas = solicitudes;
    if (turno && turno !== 'todos') {
      solicitudesFiltradas = solicitudes.filter(s => {
        const userTurno = s.usuarioId ? s.usuarioId.turno : null;
        return userTurno && userTurno.toLowerCase() === turno.toLowerCase();
      });
    }

    const solicitudesPorEstado = {
      pendiente: solicitudesFiltradas.filter(s => s.estado === 'pendiente').length,
      aprobado: solicitudesFiltradas.filter(s => s.estado === 'aprobado').length,
      rechazado: solicitudesFiltradas.filter(s => s.estado === 'rechazado').length
    };

    const solicitudesPorTurno = {
      matutino: solicitudesFiltradas.filter(s => s.usuarioId?.turno?.toLowerCase() === 'matutino').length,
      vespertino: solicitudesFiltradas.filter(s => s.usuarioId?.turno?.toLowerCase() === 'vespertino').length
    };

    const proyectores = await Proyector.find({});
    const proyectoresPorEstado = {
      disponible: proyectores.filter(p => p.estado === 'disponible').length,
      enUso: proyectores.filter(p => p.estado === 'en uso').length,
      mantenimiento: proyectores.filter(p => p.estado === 'mantenimiento').length
    };

    const fechaInicio = new Date(startDate);
    const fechaFin = new Date(endDate);
    const solicitudesPorFecha = {};

    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      solicitudesPorFecha[d.toISOString().split('T')[0]] = 0;
    }

    solicitudesFiltradas.forEach(s => {
      const fecha = new Date(s.fechaInicio).toISOString().split('T')[0];
      if (solicitudesPorFecha[fecha] !== undefined) {
        solicitudesPorFecha[fecha]++;
      }
    });

    const solicitudesPorDia = Object.entries(solicitudesPorFecha).map(([fecha, cantidad]) => ({ fecha, cantidad }));

    const ultimasSolicitudes = solicitudesFiltradas
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
      .slice(0, 10)
      .map(s => ({
        id: s._id,
        usuario: s.usuarioId ? s.usuarioId.nombre : 'Usuario no encontrado',
        fecha: new Date(s.fechaInicio).toISOString().split('T')[0],
        estado: s.estado,
        turno: s.usuarioId ? s.usuarioId.turno : 'Turno no definido'
      }));

    res.json({
      totalSolicitudes: solicitudesFiltradas.length,
      solicitudesPorEstado,
      solicitudesPorTurno,
      proyectoresPorEstado,
      solicitudesPorDia,
      ultimasSolicitudes
    });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ message: 'Error al generar reporte' });
  }
});

module.exports = router;
