const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadPdf, verificarUrlCloudinary } = require('../services/cloudinaryService');
const { verifyToken } = require('../middleware/auth');

router.post('/upload-pdf', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const existingDoc = await Document.findOne({ usuarioId: userId, createdAt: { $gte: startOfWeek } });
    if (existingDoc) {
      return res.status(403).json({
        message: 'Ya has subido un documento esta semana. Solo se permite un documento por usuario por semana.'
      });
    }

    uploadPdf.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Error en multer durante la subida:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'El archivo excede el límite de 2MB' });
        }
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      }

      const fileUrl = req.file.path;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      const newDocument = new Document({
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl,
        usuarioId: userId,
        email: req.body.email,
        nombre: req.body.nombre,
        grado: req.body.grado,
        grupo: req.body.grupo,
        turno: req.body.turno,
        estado: 'pendiente',
        expirationDate
      });

      const savedDocument = await newDocument.save();

      const admins = await User.find({ isAdmin: true });
      for (const admin of admins) {
        await new Notification({
          tipo: 'documento',
          mensaje: `${req.body.nombre} ha subido un nuevo documento para revisión`,
          destinatario: admin._id,
          remitente: userId,
          leida: false,
          enlace: '/admin/documentos',
          entidadId: savedDocument._id,
          entidadTipo: 'Document'
        }).save();
      }

      res.status(201).json({ message: 'Documento subido correctamente', document: savedDocument });
    });
  } catch (error) {
    console.error('Error general en la subida de PDF:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
  }
});

router.get('/view-document/:id', async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    const fileUrl = documento.fileUrl || documento.filePath;
    if (!fileUrl) {
      return res.status(404).json({ message: 'URL del documento no encontrada' });
    }

    return res.redirect(fileUrl);
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ message: 'Error al obtener documento', error: error.message });
  }
});

router.get('/documentos/usuario/:id', verifyToken, async (req, res) => {
  try {
    const documentos = await Document.find({ usuarioId: req.params.id });
    if (documentos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron documentos para este usuario' });
    }
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del usuario:', error);
    res.status(500).json({ message: 'Error al obtener documentos del usuario' });
  }
});

router.get('/verificar-documento/:id', verifyToken, async (req, res) => {
  try {
    const documento = await Document.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    const fileUrl = documento.fileUrl || documento.filePath;
    res.json({ documento, urlVerificada: fileUrl, mensaje: 'Usa esta URL para acceder al documento' });
  } catch (error) {
    console.error('Error al verificar documento:', error);
    res.status(500).json({ message: 'Error al verificar documento' });
  }
});

router.get('/api/diagnostico-documentos', verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const documentos = await Document.find().sort({ createdAt: -1 }).limit(10);
    const resultados = [];

    for (const doc of documentos) {
      const url = doc.fileUrl || doc.filePath;
      let verificacion;
      try {
        verificacion = await verificarUrlCloudinary(url);
      } catch (error) {
        verificacion = { valido: false, error: error.message };
      }
      resultados.push({
        _id: doc._id, fileName: doc.fileName, fileUrl: doc.fileUrl,
        filePath: doc.filePath, createdAt: doc.createdAt, verificacion
      });
    }

    res.json({
      mensaje: 'Diagnóstico completado',
      documentos: resultados,
      configuracion: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: '***' + process.env.CLOUDINARY_API_KEY.slice(-4)
      }
    });
  } catch (error) {
    console.error('Error en diagnóstico de documentos:', error);
    res.status(500).json({ message: 'Error en diagnóstico', error: error.message });
  }
});

module.exports = router;
