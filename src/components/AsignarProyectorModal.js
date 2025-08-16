import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { X, Search, Loader, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const AsignarProyectorModal = ({ show, onClose, solicitud, onAsignar }) => {
  const [proyectoresDisponibles, setProyectoresDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProyector, setSelectedProyector] = useState(null);
  
  // Obtener el tema actual
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    const cargarProyectoresDisponibles = async () => {
      if (!show) return;
      
      try {
        const response = await authService.api.get('/api/proyectores?estado=disponible');
        setProyectoresDisponibles(response.data);
        setError(null);
      } catch (error) {
        console.error('Error al cargar proyectores:', error);
        setError('Error al cargar los proyectores disponibles');
      } finally {
        setLoading(false);
      }
    };

    cargarProyectoresDisponibles();
  }, [show]);

  const handleAsignarProyector = async (proyector) => {
    try {
      setSelectedProyector(proyector);
      console.log('Intentando asignar proyector como:', sessionStorage.getItem('currentUser'));

      // Actualizar estado de la solicitud a aprobado
      const solicitudResponse = await authService.api.put(`/solicituds/${solicitud._id}`, {
        estado: 'aprobado',
        proyectorId: proyector._id
      });

      if (solicitudResponse.status === 403) {
        throw new Error('No tienes permisos para asignar proyectores');
      }

      // Actualizar estado del proyector a "en uso"
      await authService.api.put(`/api/proyectores/${proyector._id}`, {
        estado: 'en uso'
      });

      // Enviar notificación al usuario DESPUÉS de asignar el proyector
      await authService.api.post('/api/notifications', {
        usuarioId: solicitud.usuarioId._id,
        mensaje: `Tu solicitud de proyector ha sido aprobada para la fecha ${new Date(solicitud.fechaInicio).toLocaleDateString()}. Proyector asignado: ${proyector.codigo}`,
        tipo: 'success'
      });

      // Mostrar toast de éxito con información detallada
      toast.success(
        `¡Proyector ${proyector.codigo} asignado correctamente!`,
        {
          duration: 5000, // 5 segundos
          icon: '🎯',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }
      );

      onAsignar(proyector);
      onClose();
    } catch (error) {
      console.error('Error al asignar proyector:', error);
      toast.error(
        error.response?.status === 403 
          ? 'No tienes permisos para realizar esta acción'
          : `Error al asignar proyector: ${error.response?.data?.message || error.message}`
      );
      setSelectedProyector(null);
    }
  };

  return show && (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full relative shadow-xl overflow-hidden"
        >
          {/* Header con gradiente del tema */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 flex justify-between items-center`}>
            <h2 className="text-xl font-bold text-white">
              Asignar Proyector
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar proyector..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg
                           bg-gray-50 dark:bg-gray-700 
                           border border-gray-300 dark:border-gray-600
                           text-gray-900 dark:text-gray-100
                           placeholder-gray-500 dark:placeholder-gray-400
                           focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
                           focus:ring-blue-500 dark:focus:ring-blue-600
                           focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 
                             text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800/50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${themeStyles.gradient} flex items-center justify-center mb-4`}>
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Cargando proyectores disponibles...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                {proyectoresDisponibles.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${themeStyles.gradient} bg-opacity-10 dark:bg-opacity-20 mb-4`}>
                      <svg className={`w-8 h-8 ${themeStyles.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay proyectores disponibles en este momento
                    </p>
                  </div>
                ) : (
                  proyectoresDisponibles
                    .filter(p => 
                      p.estado === 'disponible' && (
                        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        `${p.grado}${p.grupo}`.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                    )
                    .map(proyector => (
                      <motion.div
                        key={proyector._id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative overflow-hidden border dark:border-gray-600 rounded-lg p-4 
                                 cursor-pointer transition-all duration-200 shadow-sm
                                 ${selectedProyector?._id === proyector._id 
                                   ? `ring-2 ring-offset-2 ${themeStyles.border}` 
                                   : 'hover:shadow-md dark:hover:shadow-gray-900/50'}`}
                        onClick={() => handleAsignarProyector(proyector)}
                      >
                        {/* Fondo con gradiente del tema cuando está seleccionado */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${themeStyles.gradient} opacity-${
                          selectedProyector?._id === proyector._id ? '10' : '0'
                        } transition-opacity duration-300 ${
                          selectedProyector?._id === proyector._id ? '' : 'group-hover:opacity-5'
                        }`}></div>
                        
                        {/* Contenido de la card */}
                        <div className="relative z-10">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                                             bg-gradient-to-r ${themeStyles.gradient} text-white font-bold text-lg
                                             shadow-sm mr-3`}>
                                {proyector.codigo.charAt(0)}
                              </div>
                              <div>
                                <h3 className={`font-semibold text-lg ${
                                  selectedProyector?._id === proyector._id 
                                    ? themeStyles.text 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {proyector.codigo}
                                </h3>
                                <div className="mt-1 space-y-1">
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <span className="mr-2">Grado:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      selectedProyector?._id === proyector._id
                                        ? 'bg-white/10 text-gray-800 dark:text-gray-200'
                                        : `${themeStyles.background} ${themeStyles.text}`
                                    }`}>
                                      {proyector.grado}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <span className="mr-2">Grupo:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      selectedProyector?._id === proyector._id
                                        ? 'bg-white/10 text-gray-800 dark:text-gray-200'
                                        : `${themeStyles.background} ${themeStyles.text}`
                                    }`}>
                                      {proyector.grupo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                                           ${selectedProyector?._id === proyector._id
                                             ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                             : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800/50'
                                           }`}>
                              {proyector.estado}
                            </span>
                          </div>
                          
                          {selectedProyector?._id === proyector._id && (
                            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center">
                              <div className="animate-pulse flex items-center text-green-600 dark:text-green-400">
                                <Check className="w-4 h-4 mr-1" />
                                <span className="text-sm">Asignando...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona un proyector para asignarlo a esta solicitud
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 
                         text-gray-700 dark:text-gray-300 hover:bg-gray-300 
                         dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AsignarProyectorModal; 