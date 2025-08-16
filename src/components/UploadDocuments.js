import React, { useState, useCallback, useEffect } from 'react';
import { FiUploadCloud, FiFile, FiX, FiCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

function UploadDocuments() {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isFirstUpload, setIsFirstUpload] = useState(true);
  const [weeklyQuotaUsed, setWeeklyQuotaUsed] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState('');

  useEffect(() => {
    console.log('Token en sessionStorage:', sessionStorage.getItem('jwtToken'));
    console.log('Usuario en sessionStorage:', sessionStorage.getItem('currentUser'));
    
    const checkExistingDocument = async () => {
      try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const token = sessionStorage.getItem('jwtToken');
        
        if (!currentUser || !token) {
          console.error('No hay usuario o token disponible');
          return;
        }

        const response = await authService.api.get(`/documentos/usuario/${currentUser._id}`);
        
        if (response.data) {
          // Verificar si el documento es de esta semana
          const docDate = new Date(response.data.createdAt);
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
          startOfWeek.setHours(0, 0, 0, 0);
          
          if (docDate >= startOfWeek) {
            setWeeklyQuotaUsed(true);
            
            // Calcular próximo domingo
            const nextSunday = new Date(startOfWeek);
            nextSunday.setDate(nextSunday.getDate() + 7);
            setNextAvailableDate(nextSunday.toLocaleDateString());
            
            setStatusMessage(`Ya has subido un documento esta semana. Podrás subir otro a partir del ${nextSunday.toLocaleDateString()}.`);
            setUploadStatus('warning');
          } else {
            setStatusMessage('Ya tienes un documento subido. Si subes otro, reemplazará al anterior.');
            setUploadStatus('info');
          }
          
          setIsFirstUpload(false);
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          setStatusMessage('Error al verificar documentos existentes. Por favor, intenta más tarde.');
          setUploadStatus('error');
          console.error('Error al verificar documento existente:', error);
        } else {
          setStatusMessage('Aún no has subido ningún documento. ¡Sube tu primer documento!');
          setUploadStatus('info');
          setIsFirstUpload(true);
        }
      }
    };

    checkExistingDocument();
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (isValidFileType(droppedFile)) {
      setFile(droppedFile);
      setUploadStatus(null);
    } else {
      setStatusMessage('Tipo de archivo no permitido. Por favor, sube PDF.');
      setUploadStatus('error');
    }
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    if (!selectedFile) return;
    
    if (!isValidFileType(selectedFile)) {
      setStatusMessage('Solo se permiten archivos PDF.');
      setUploadStatus('error');
      return;
    }
    
    if (!isValidFileSize(selectedFile)) {
      setStatusMessage('El archivo excede el límite de 2MB.');
      setUploadStatus('error');
      return;
    }
    
    setFile(selectedFile);
    setUploadStatus(null);
  };

  const isValidFileType = (file) => {
    // Solo permitir PDFs
    return file && file.type === 'application/pdf';
  };
  
  const isValidFileSize = (file) => {
    // Verificar que el archivo no exceda 2MB
    return file && file.size <= 2 * 1024 * 1024;
  };

  const handleFileUpload = async () => {
    if (!file) return;
    
    if (weeklyQuotaUsed) {
      setStatusMessage(`Ya has subido un documento esta semana. Podrás subir otro a partir del ${nextAvailableDate}.`);
      setUploadStatus('warning');
      return;
    }

    // Mostrar estado de carga
    setUploadStatus('loading');
    setStatusMessage('Subiendo documento...');

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      const token = sessionStorage.getItem('jwtToken');
      
      if (!currentUser || !token) {
        setStatusMessage('No hay sesión activa. Por favor, inicia sesión nuevamente.');
        setUploadStatus('error');
        return;
      }

      formData.append('usuarioId', currentUser._id);
      formData.append('nombre', currentUser.nombre);
      formData.append('email', currentUser.email);
      formData.append('grado', currentUser.grado || '');
      formData.append('grupo', currentUser.grupo || '');
      formData.append('turno', currentUser.turno || '');

      const response = await authService.api.post('/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setUploadStatus('success');
      setStatusMessage('Documento subido exitosamente. Se eliminará automáticamente después de una semana.');
      setFile(null);
      setWeeklyQuotaUsed(true);
      
      // Calcular próximo domingo
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
      const nextSunday = new Date(startOfWeek);
      nextSunday.setDate(nextSunday.getDate() + 7);
      setNextAvailableDate(nextSunday.toLocaleDateString());
      
    } catch (error) {
      setUploadStatus('error');
      setStatusMessage(error.response?.data?.message || 'Error al subir el archivo');
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-2xl font-bold ${themeStyles.text} mb-8`}>
          Subir Documentos
        </h2>
        
        {/* Información sobre restricciones */}
        <div className={`mb-6 p-4 ${themeStyles.background} rounded-lg border ${themeStyles.border}`}>
          <div className="flex items-start">
            <FiInfo className={`h-5 w-5 ${themeStyles.text} mt-0.5 mr-3`} />
            <div>
              <h3 className={`font-medium ${themeStyles.text}`}>Restricciones de subida</h3>
              <ul className={`mt-2 text-sm ${themeStyles.text} space-y-1`}>
                <li>• Solo se permite un documento por usuario por semana</li>
                <li>• Solo se aceptan archivos PDF</li>
                <li>• Tamaño máximo: 2MB</li>
                <li>• Los documentos se eliminarán automáticamente después de una semana</li>
              </ul>
            </div>
          </div>
        </div>
        
        {uploadStatus && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3
            ${uploadStatus === 'success' 
              ? `${themeStyles.background} ${themeStyles.text}`
              : uploadStatus === 'warning'
              ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : uploadStatus === 'info'
              ? `${themeStyles.background} ${themeStyles.text}`
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}
          >
            <div className={`rounded-full p-1 
              ${uploadStatus === 'success' 
                ? `${themeStyles.background}`
                : uploadStatus === 'warning'
                ? 'bg-yellow-100 dark:bg-yellow-800'
                : uploadStatus === 'info'
                ? `${themeStyles.background}`
                : 'bg-red-100 dark:bg-red-800'}`}
            >
              {uploadStatus === 'success' ? (
                <FiCheck className="h-5 w-5" />
              ) : uploadStatus === 'warning' ? (
                <FiAlertTriangle className="h-5 w-5" />
              ) : uploadStatus === 'info' ? (
                <FiInfo className="h-5 w-5" />
              ) : (
                <FiX className="h-5 w-5" />
              )}
            </div>
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {/* Área de arrastrar y soltar */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-8
              transition-all duration-200 ease-in-out
              ${isDragging 
                ? `${themeStyles.border} ${themeStyles.background}`
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
              ${file 
                ? 'bg-gray-50 dark:bg-gray-800/50' 
                : 'bg-white dark:bg-gray-800/30'}
            `}
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="text-center">
              <div className={`${themeStyles.background} p-4 rounded-full w-20 h-20 mx-auto mb-4 
                              flex items-center justify-center`}>
                <FiUploadCloud className={`h-10 w-10 ${themeStyles.text}`} />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Arrastra y suelta tu archivo aquí'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  PDF (máximo 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Botón de subida */}
          {file && !uploadStatus && (
            <button
              onClick={handleFileUpload}
              className={`mt-6 w-full bg-gradient-to-r ${themeStyles.gradient} text-white 
                       px-6 py-3 rounded-lg text-sm font-medium
                       ${themeStyles.hover}
                       focus:ring-4 focus:ring-opacity-50 ${themeStyles.border}
                       transition-all duration-200 
                       flex items-center justify-center gap-2
                       shadow-lg hover:shadow-xl`}
            >
              <FiFile className="h-5 w-5" />
              <span>Subir Documento</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadDocuments;