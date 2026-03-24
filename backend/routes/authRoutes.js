const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const ADMIN_EMAILS = require('../config/adminEmails');

const oauth2Client = new OAuth2Client(process.env.CLIENT_ID);

router.post('/login', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token no proporcionado' });
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Payload de Google inválido' });
    }

    const { email, name, picture } = payload;

    if (!email.endsWith('@unach.mx') && !ADMIN_EMAILS.includes(email)) {
      return res.status(401).json({
        message: 'Solo se permiten correos institucionales (@unach.mx) o administradores autorizados'
      });
    }

    let pvez = null;
    let usuario = await User.findOne({ email });
    if (!usuario) {
      usuario = new User({
        nombre: name,
        email,
        picture,
        isAdmin: ADMIN_EMAILS.includes(email)
      });
      await usuario.save();
      pvez = true;
    } else {
      if (usuario.grado === null && usuario.grupo === null && usuario.turno === null) {
        pvez = true;
      }
    }

    const jwtToken = jwt.sign(
      { id: usuario._id, email: usuario.email, isAdmin: ADMIN_EMAILS.includes(email) },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ message: 'Login exitoso', user: usuario, token: jwtToken, refreshToken, pvez });
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ message: 'Autenticación fallida', error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

router.get('/check-session', verifyToken, async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ user: usuario, message: 'Sesión válida' });
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    res.status(500).json({ message: 'Error al verificar la sesión' });
  }
});

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Acceso concedido', user: req.user });
});

router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.headers['authorization']?.split(' ')[1];

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const newToken = jwt.sign(
      { id: user._id, email: user.email, isAdmin: ADMIN_EMAILS.includes(user.email) },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token: newToken, user: { id: user._id, email: user.email, nombre: user.nombre, picture: user.picture } });
  } catch (error) {
    console.error('Error al renovar token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/calendar-event', verifyToken, async (req, res) => {
  const user = req.user;
  const googleToken = user.googleToken;

  try {
    const calendarApiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const event = {
      summary: 'Solicitud de proyector',
      start: { dateTime: '2024-10-02T09:00:00-07:00', timeZone: 'America/Mexico_City' },
      end: { dateTime: '2024-10-02T10:00:00-07:00', timeZone: 'America/Mexico_City' },
    };

    const response = await axios.post(calendarApiUrl, event, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });

    res.status(200).json({ message: 'Evento creado en Google Calendar', event: response.data });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear evento en Google Calendar', error });
  }
});

module.exports = router;
