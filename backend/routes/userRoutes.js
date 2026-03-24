const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await User.find();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
});

router.put('/update-user', verifyToken, async (req, res) => {
  try {
    const { grado, grupo, turno } = req.body;
    const userId = req.user.id;

    if (!grado || !grupo || !turno) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { grado, grupo, turno }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado correctamente', user: updatedUser });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar el usuario', error: error.message });
  }
});

router.get('/user-data', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ user: usuario });
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener datos del usuario' });
  }
});

router.put('/update-theme', async (req, res) => {
  try {
    const { theme, darkMode } = req.body;
    let userId;

    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      await User.findByIdAndUpdate(userId, { theme, darkMode });
    }

    await User.findOneAndUpdate(
      {},
      { theme, darkMode },
      { sort: { updatedAt: -1 }, upsert: true }
    );

    res.json({ success: true, theme, darkMode });
  } catch (error) {
    console.error('Error al actualizar tema:', error);
    res.status(500).json({ message: 'Error al actualizar el tema' });
  }
});

router.get('/user-theme', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ theme: usuario.theme || 'default', darkMode: usuario.darkMode || false });
  } catch (error) {
    console.error('Error al obtener tema:', error);
    res.status(500).json({ message: 'Error al obtener el tema', error: error.message });
  }
});

router.get('/last-theme', async (req, res) => {
  try {
    const ultimoTema = await User.findOne({}, { theme: 1, darkMode: 1 }).sort({ updatedAt: -1 }).limit(1);
    res.json({ theme: ultimoTema?.theme || 'default', darkMode: ultimoTema?.darkMode || false });
  } catch (error) {
    console.error('Error al obtener último tema:', error);
    res.status(500).json({ message: 'Error al obtener el tema', error: error.message });
  }
});

module.exports = router;
