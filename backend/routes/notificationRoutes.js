const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/api/notifications', verifyToken, isAdmin, async (req, res) => {
  try {
    const { usuarioId, mensaje, tipo, entidadId, entidadTipo } = req.body;
    const notification = new Notification({ usuarioId, mensaje, tipo, entidadId, entidadTipo });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear notificación' });
  }
});

router.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ usuarioId: req.user.id, leida: false })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
});

router.put('/api/notifications/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ usuarioId: req.user.id, leida: false }, { leida: true });
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ message: 'Error al actualizar notificaciones' });
  }
});

router.put('/api/notifications/:id', verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar notificación' });
  }
});

module.exports = router;
