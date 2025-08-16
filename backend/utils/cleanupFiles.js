const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Document = require('../models/Document');
require('dotenv').config();

// Función para limpiar archivos antiguos
async function cleanupFiles() {
  try {
    console.log('Iniciando limpieza semanal de archivos...');
    
    // Conectar a la base de datos si no está conectado
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Obtener la fecha de hace una semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Buscar documentos antiguos
    const oldDocuments = await Document.find({
      createdAt: { $lt: oneWeekAgo }
    });
    
    console.log(`Se encontraron ${oldDocuments.length} documentos antiguos para eliminar`);
    
    // Eliminar archivos y registros
    for (const doc of oldDocuments) {
      try {
        // Eliminar archivo físico
        const filePath = path.join(__dirname, '..', doc.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Archivo eliminado: ${filePath}`);
        }
        
        // Eliminar registro de la base de datos
        await Document.findByIdAndDelete(doc._id);
        console.log(`Documento eliminado de la base de datos: ${doc._id}`);
      } catch (err) {
        console.error(`Error al eliminar documento ${doc._id}:`, err);
      }
    }
    
    console.log('Limpieza semanal completada');
  } catch (error) {
    console.error('Error durante la limpieza de archivos:', error);
  } finally {
    // Si conectamos a la base de datos en esta función, desconectar
    if (mongoose.connection.readyState === 1 && process.env.NODE_ENV !== 'production') {
      await mongoose.disconnect();
    }
  }
}

// Exportar para uso en cron
module.exports = cleanupFiles;

// Si se ejecuta directamente
if (require.main === module) {
  cleanupFiles()
    .then(() => {
      console.log('Limpieza manual completada');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error en limpieza manual:', err);
      process.exit(1);
    });
} 