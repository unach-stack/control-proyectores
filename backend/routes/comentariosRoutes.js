const express = require('express');
const router = express.Router();
const ProyectorComment = require('../models/ProyectorComment');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/api/proyector-comments', verifyToken, async (req, res) => {
  try {
    const { solicitudId, proyectorId, issues, comments } = req.body;

    const newComment = new ProyectorComment({
      solicitudId,
      proyectorId,
      userId: req.user.id,
      issues,
      comments
    });

    const savedComment = await newComment.save();

    const populatedComment = await ProyectorComment.findById(savedComment._id)
      .populate('proyectorId', 'codigo')
      .populate('userId', 'nombre email')
      .populate('solicitudId', 'motivo fechaInicio');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});

router.get('/api/proyector-comments', verifyToken, isAdmin, async (req, res) => {
  try {
    const comments = await ProyectorComment.find()
      .populate('proyectorId', 'codigo')
      .populate('userId', 'nombre email')
      .populate('solicitudId', 'motivo fechaInicio')
      .sort({ timestamp: -1 });

    res.json(comments);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

router.put('/api/proyector-comments/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const updatedComment = await ProyectorComment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('proyectorId', 'codigo')
      .populate('userId', 'nombre email')
      .populate('solicitudId', 'motivo fechaInicio');

    if (!updatedComment) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.json(updatedComment);
  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({ message: 'Error al actualizar comentario' });
  }
});

module.exports = router;
