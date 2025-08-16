const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Verificar la configuración
console.log("Cloudinary configurado con cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);

// Configurar almacenamiento para PDFs
const uploadPdf = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'pdfs',
      resource_type: 'raw', // Importante para PDFs
      format: 'pdf',
      public_id: (req, file) => {
        try {
          const userId = req.user?.id || 'anonymous';
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `pdf_${userId}_${timestamp}`;
          console.log("Generando public_id para Cloudinary:", filename);
          return filename;
        } catch (error) {
          console.error("Error al generar public_id:", error);
          return `pdf_error_${Date.now()}`;
        }
      }
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'), false);
    }
    cb(null, true);
  }
});

// Función para verificar la conexión con Cloudinary
const verificarConexionCloudinary = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log("Conexión con Cloudinary verificada:", result);
    return { status: 'success', message: 'Conexión exitosa con Cloudinary' };
  } catch (error) {
    console.error("Error al conectar con Cloudinary:", error);
    return { status: 'error', message: error.message };
  }
};

// Función para limpiar archivos antiguos
async function cleanupOldFiles() {
  try {
    console.log('Iniciando limpieza de archivos en Cloudinary...');
    
    // Calcular fecha de hace una semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const timestamp = Math.floor(oneWeekAgo.getTime() / 1000);
    
    // Buscar recursos antiguos
    const result = await cloudinary.search
      .expression(`folder:pdfs AND uploaded_at<${timestamp}`)
      .max_results(500)
      .execute();
    
    let deletedCount = 0;
    
    // Eliminar recursos encontrados
    for (const resource of result.resources) {
      await cloudinary.uploader.destroy(resource.public_id, { resource_type: 'raw' });
      console.log(`Archivo eliminado: ${resource.public_id}`);
      deletedCount++;
    }
    
    console.log(`Limpieza completada. ${deletedCount} archivos eliminados.`);
    return deletedCount;
  } catch (error) {
    console.error('Error durante la limpieza de archivos:', error);
    throw error;
  }
}

// Función para verificar una URL de Cloudinary
const verificarUrlCloudinary = async (url) => {
  try {
    console.log("Verificando URL de Cloudinary:", url);
    
    // Extraer el public_id de la URL
    const regex = /\/upload\/v\d+\/(.+)$/;
    const match = url.match(regex);
    
    if (!match || !match[1]) {
      console.error("No se pudo extraer el public_id de la URL:", url);
      return { valido: false, mensaje: "URL no válida" };
    }
    
    const publicId = match[1].replace(/\.\w+$/, ''); // Quitar extensión
    console.log("Public ID extraído:", publicId);
    
    // Verificar si el recurso existe en Cloudinary
    const result = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
    console.log("Recurso encontrado en Cloudinary:", result);
    
    return { 
      valido: true, 
      mensaje: "URL válida", 
      detalles: result 
    };
  } catch (error) {
    console.error("Error al verificar URL de Cloudinary:", error);
    return { 
      valido: false, 
      mensaje: "Error al verificar URL", 
      error: error.message 
    };
  }
};

module.exports = {
  uploadPdf,
  cleanupOldFiles,
  cloudinary,
  verificarUrlCloudinary,
  verificarConexionCloudinary
}; 