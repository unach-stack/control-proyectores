const express = require('express');
const router = express.Router();
const Proyector = require('../models/Proyector');
const { verifyToken, isAdmin } = require('../middleware/auth');

// GET /api/proyectores
router.get('/', verifyToken, async (req, res) => {
  try {
    const proyectores = await Proyector.find()
      .sort({ grado: 1, grupo: 1 });
    res.json(proyectores);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proyectores', error });
  }
});

// POST /api/proyectores
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body);

    const { codigo, grado, grupo, estado, turno } = req.body;

    // Validar que todos los campos requeridos existan
    if (!grado || !grupo || !turno) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos',
        received: { grado, grupo, turno }
      });
    }

    // Convertir grupo a mayúsculas
    const grupoUpper = grupo.toUpperCase();
    
    // Convertir grado a número
    const gradoNum = parseInt(grado);

    // Generar código aleatorio de 4 caracteres (números y letras)
    const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Crear el código en el formato deseado: PRY-[grado][grupo]-[random]
    const codigoGenerado = `PRY-${gradoNum}${grupoUpper}-${randomString}`;

    // Crear el objeto proyector
    const proyectorData = {
      codigo: codigoGenerado,
      grado: gradoNum,
      grupo: grupoUpper,
      estado: estado || 'disponible',
      turno: turno
    };

    console.log('Datos del proyector a crear:', proyectorData);

    const proyector = new Proyector(proyectorData);
    const proyectorGuardado = await proyector.save();
    
    console.log('Proyector guardado:', proyectorGuardado);

    res.status(201).json(proyectorGuardado);

  } catch (error) {
    console.error('Error completo:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: `Ya existe un proyector asignado a este grado, grupo y turno`
      });
    }

    res.status(500).json({ 
      message: 'Error al crear proyector', 
      error: error.message,
      stack: error.stack
    });
  }
});

// PUT /api/proyectores/:id
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    const { id } = req.params;

    const proyectorActualizado = await Proyector.findByIdAndUpdate(id, { estado }, { new: true });

    if (!proyectorActualizado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }

    res.json(proyectorActualizado);
  } catch (error) {
    console.error('Error al actualizar proyector:', error);
    res.status(500).json({ message: 'Error al actualizar proyector' });
  }
});

// DELETE /api/proyectores/:id
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const proyectorEliminado = await Proyector.findByIdAndDelete(req.params.id);

    if (!proyectorEliminado) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }

    res.json({ message: 'Proyector eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar proyector:', error);
    res.status(500).json({ message: 'Error al eliminar proyector', error: error.message });
  }
});

// GET /api/proyectores/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const proyector = await Proyector.findById(req.params.id);
    if (!proyector) {
      return res.status(404).json({ message: 'Proyector no encontrado' });
    }
    res.json(proyector);
  } catch (error) {
    console.error('Error al obtener proyector por ID:', error);
    res.status(500).json({ message: 'Error al obtener proyector' });
  }
});

module.exports = router;
