import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AsignarProyectorModal from './AsignarProyectorModal';
import { alertaError, alertaExito } from './Alert';
import { ArrowLeft, Loader } from 'lucide-react';
import { alertService } from '../services/alertService';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { motion } from 'framer-motion';

const AsignarProyectorDirecto = () => {
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Usar un ref para controlar si ya se mostró una alerta
  const alertaShown = useRef(false);
  // Ref para controlar si el componente está montado
  const isMounted = useRef(true);
  
  // Obtener el tema actual
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    // Limpiar el estado de alertas al montar el componente
    alertaShown.current = false;
    alertService.clearRecentAlerts();
    
    const fetchSolicitud = async () => {
      try {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);
        
        // Obtener parámetros de la URL
        const params = new URLSearchParams(location.search);
        const solicitudId = params.get('solicitudId');
        
        if (!solicitudId) {
          setError('No se proporcionó un ID de solicitud válido');
          setLoading(false);
          return;
        }
        
        console.log("Buscando solicitud con ID:", solicitudId);
        
        // Intentar obtener todas las solicitudes primero (más confiable)
        try {
          const allSolicitudesResponse = await authService.api.get('/solicitudes');
          const solicitudEncontrada = allSolicitudesResponse.data.find(
            sol => sol._id === solicitudId
          );
          
          if (solicitudEncontrada && isMounted.current) {
            console.log("Solicitud encontrada en listado completo:", solicitudEncontrada);
            setSolicitud(solicitudEncontrada);
            setShowModal(true);
            setLoading(false);
            return;
          }
        } catch (listError) {
          console.error("Error al obtener listado de solicitudes:", listError);
          // Continuar con el siguiente método si este falla
        }
        
        // Si no se encontró en el listado, intentar con el endpoint específico
        try {
          const response = await authService.api.get(`/solicitudes/id/${solicitudId}`);
          
          if (response.data && isMounted.current) {
            console.log("Solicitud encontrada por ID específico:", response.data);
            setSolicitud(response.data);
            setShowModal(true);
          } else if (isMounted.current) {
            setError('No se encontró la solicitud especificada');
          }
        } catch (idError) {
          console.error("Error al obtener la solicitud por ID:", idError);
          if (isMounted.current && !alertaShown.current) {
            setError('Error al obtener la solicitud. Verifique el código QR e intente nuevamente.');
          }
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    fetchSolicitud();
    
    // Limpiar al desmontar
    return () => {
      isMounted.current = false;
      alertaShown.current = true;
    };
  }, [location]);

  const handleAsignarSuccess = () => {
    if (!alertaShown.current) {
      alertaExito('Proyector asignado correctamente');
      alertaShown.current = true;
    }
    setShowModal(false);
    // Opcional: redirigir a otra página después de asignar
    // navigate('/admin-dashboard');
  };

  const handleVolver = () => {
    navigate(-1); // Volver a la página anterior
  };

  // Mostrar alerta de error solo una vez
  useEffect(() => {
    if (error && !alertaShown.current) {
      alertaError(error);
      alertaShown.current = true;
    }
  }, [error]);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={handleVolver}
          className={`mb-4 flex items-center ${themeStyles.text} hover:opacity-80 transition-all duration-300 transform hover:scale-105`}
        >
          <ArrowLeft className="mr-1" size={16} />
          Volver
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
        >
          {/* Header con gradiente del tema */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 sm:p-6`}>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Asignación directa de proyector
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Escanea un código QR para asignar un proyector rápidamente
            </p>
          </div>
          
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${themeStyles.gradient} flex items-center justify-center mb-4`}>
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Buscando información de la solicitud...
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800/50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            ) : !solicitud ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Atención</h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-200">No se encontró información de la solicitud</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Éxito</h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-200">Solicitud encontrada. Abriendo modal de asignación...</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Información de la solicitud si está disponible */}
            {solicitud && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h2 className={`text-lg font-medium ${themeStyles.text} mb-4`}>Detalles de la solicitud</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Solicitante</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {solicitud.usuarioId?.nombre || 'No disponible'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                    <p className={`font-medium ${
                      solicitud.estado === 'pendiente' ? 'text-yellow-600 dark:text-yellow-400' :
                      solicitud.estado === 'aprobado' ? 'text-green-600 dark:text-green-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {solicitud.estado?.charAt(0).toUpperCase() + solicitud.estado?.slice(1) || 'No disponible'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de inicio</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(solicitud.fechaInicio).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de fin</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(solicitud.fechaFin).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowModal(true)}
                    className={`px-4 py-2 rounded-md bg-gradient-to-r ${themeStyles.gradient} text-white 
                              shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
                  >
                    Asignar proyector
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal de asignación */}
      {solicitud && showModal && (
        <AsignarProyectorModal
          show={showModal}
          onClose={() => setShowModal(false)}
          solicitud={solicitud}
          onAsignar={handleAsignarSuccess}
        />
      )}
    </div>
  );
};

export default AsignarProyectorDirecto; 