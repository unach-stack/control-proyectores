import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { alertaError, alertaExito } from './Alert';
import { ArrowLeft, Loader, CheckCircle, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const AsignarProyectorDirecto = () => {
  const [solicitud, setSolicitud] = useState(null);
  const [proyectoresDisponibles, setProyectoresDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProyector, setSelectedProyector] = useState(null);
  const [asignando, setAsignando] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(location.search);
        const solicitudId = params.get('solicitudId');

        if (!solicitudId) {
          throw new Error('Falta el ID de la solicitud en la URL');
        }

        // Obtener datos de la solicitud y proyectores disponibles
        const [solicitudRes, proyectoresRes] = await Promise.all([
          authService.api.get(`/solicitudes/id/${solicitudId}`),
          authService.api.get('/api/proyectores?estado=disponible')
        ]);

        setSolicitud(solicitudRes.data);
        setProyectoresDisponibles(proyectoresRes.data);

      } catch (err) {
        setError(err.message || 'Error al cargar los datos');
        alertaError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]);

  const handleAsignarProyector = async (proyector) => {
    try {
      setAsignando(true);
      setSelectedProyector(proyector);

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

      // Enviar notificación al usuario
      await authService.api.post('/api/notifications', {
        usuarioId: solicitud.usuarioId._id,
        mensaje: `Tu solicitud de proyector ha sido aprobada para la fecha ${new Date(solicitud.fechaInicio).toLocaleDateString()}. Proyector asignado: ${proyector.codigo}`,
        tipo: 'success'
      });

      toast.success(
        `¡Proyector ${proyector.codigo} asignado correctamente!`,
        {
          duration: 5000,
          icon: '🎯',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }
      );

      alertaExito('¡Proyector asignado correctamente!');
      
      // Redirigir después de un breve delay
      setTimeout(() => {
        navigate('/admin/proyectores');
      }, 2000);

    } catch (err) {
      alertaError('Error al procesar la asignación.');
      console.error('Error al asignar proyector:', err);
      setSelectedProyector(null);
    } finally {
      setAsignando(false);
    }
  };

  const handleVolver = () => navigate(-1);

  const proyectoresFiltrados = proyectoresDisponibles.filter(p => 
    p.estado === 'disponible' && (
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.grado}${p.grupo}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${themeStyles.gradient} flex items-center justify-center mb-4`}>
          <Loader className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleVolver} className={`mb-4 flex items-center ${themeStyles.text} hover:opacity-80`}>
            <ArrowLeft className="mr-1" size={16} /> Volver
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto">
        <button onClick={handleVolver} className={`mb-4 flex items-center ${themeStyles.text} hover:opacity-80`}>
          <ArrowLeft className="mr-1" size={16} /> Volver
        </button>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 sm:p-6`}>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Asignar Proyector</h1>
            <p className="text-white/80 mt-2">
              Solicitud de: {solicitud?.usuarioId?.nombre} - {new Date(solicitud?.fechaInicio).toLocaleDateString('es-MX')}
            </p>
          </div>

          <div className="p-6">
            {/* Barra de búsqueda */}
            <div className="mb-6">
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

            {/* Lista de proyectores */}
            {proyectoresFiltrados.length === 0 ? (
              <div className="text-center py-12">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proyectoresFiltrados.map(proyector => (
                  <motion.div
                    key={proyector._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden border dark:border-gray-600 rounded-lg p-4 
                             cursor-pointer transition-all duration-200 shadow-sm
                             ${selectedProyector?._id === proyector._id 
                               ? `ring-2 ring-offset-2 ${themeStyles.border}` 
                               : 'hover:shadow-md dark:hover:shadow-gray-900/50'}`}
                    onClick={() => !asignando && handleAsignarProyector(proyector)}
                  >
                    {/* Fondo con gradiente del tema cuando está seleccionado */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${themeStyles.gradient} opacity-${
                      selectedProyector?._id === proyector._id ? '10' : '0'
                    } transition-opacity duration-300`}></div>
                    
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
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Asignando...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AsignarProyectorDirecto;