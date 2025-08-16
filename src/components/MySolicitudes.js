import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { motion } from 'framer-motion';
import { Check, X, Clock, Calendar, User, BookOpen } from 'lucide-react';
import { useTimeZone } from '../contexts/TimeZoneContext';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const MySolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { formatDate } = useTimeZone();
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  // Dentro del componente MySolicitudes, añadir esta función de formato de fecha
  const formatDateLocal = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para obtener el inicio de la semana usando Date en lugar de Temporal
  const startOfWeek = (date) => {
    // Crear una copia de la fecha
    const result = new Date(date);
    // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const day = result.getDay();
    // Calcular cuántos días restar para llegar al lunes
    // Si es domingo (0), restar 6 días para llegar al lunes anterior
    // Si es otro día, restar (día - 1) días
    const diff = day === 0 ? 6 : day - 1;
    // Restar los días necesarios
    result.setDate(result.getDate() - diff);
    // Establecer la hora a 00:00:00
    result.setHours(0, 0, 0, 0);
    return result;
  };

  // Función para obtener el fin de la semana
  const endOfWeek = (date) => {
    // Obtener el inicio de la semana
    const start = startOfWeek(date);
    // Crear una copia y añadir 6 días para llegar al domingo
    const result = new Date(start);
    result.setDate(start.getDate() + 6);
    // Establecer la hora a 23:59:59
    result.setHours(23, 59, 59, 999);
    return result;
  };

  // Función para verificar si una fecha está dentro de un intervalo
  const isWithinInterval = (date, interval) => {
    // Convertir todo a objetos Date para comparación
    const checkDate = date instanceof Date ? date : new Date(date);
    const start = interval.start instanceof Date ? interval.start : new Date(interval.start);
    const end = interval.end instanceof Date ? interval.end : new Date(interval.end);
    
    // Normalizar las fechas estableciendo la hora a mediodía para evitar problemas de zona horaria
    checkDate.setHours(12, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Comparar las fechas
    return checkDate >= start && checkDate <= end;
  };

  // Función para obtener las solicitudes de la semana actual
  const obtenerSolicitudesSemanaActual = (solicitudes) => {
    // Obtener los límites de la semana actual
    const now = new Date();
    const monday = startOfWeek(now);
    const sunday = endOfWeek(now);
    
    // Filtrar las solicitudes que están dentro de la semana actual
    return solicitudes.filter(solicitud => {
      const fechaInicio = new Date(solicitud.fechaInicio);
      return isWithinInterval(fechaInicio, { start: monday, end: sunday });
    });
  };

  // Función para cargar las solicitudes del usuario
  const fetchMySolicitudes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Iniciando fetch de solicitudes...');
      const response = await authService.api.get('/mis-solicitudes');
      
      if (!response.data || response.data.length === 0) {
        console.log('No se recibieron solicitudes del servidor');
        setSolicitudes([]);
      } else {
        console.log('Solicitudes recibidas:', response.data);
        const solicitudesFiltradas = obtenerSolicitudesSemanaActual(response.data);
        console.log('Solicitudes filtradas:', solicitudesFiltradas);
        
        // Ordenar las solicitudes por fecha (más antiguas primero)
        const solicitudesOrdenadas = solicitudesFiltradas.sort((a, b) => {
          const fechaA = new Date(a.fechaInicio);
          const fechaB = new Date(b.fechaInicio);
          return fechaA - fechaB; // Orden ascendente (más antiguas primero)
        });
        
        setSolicitudes(solicitudesOrdenadas);
      }
    } catch (error) {
      console.error('Error completo:', error);
      setError('Error al cargar tus solicitudes: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySolicitudes();
  }, []);

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'aprobado':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rechazado':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'aprobado':
        return `${themeStyles.background} ${themeStyles.text}`;
      case 'rechazado':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${themeStyles.border}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 ${themeStyles.text}`}>
        Mis Solicitudes de la Semana
      </h2>
      
      {/* Indicador mejorado de semana actual */}
      <div className={`mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 ${themeStyles.background} rounded-lg shadow-sm`}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className={`w-4 h-4 sm:w-5 sm:h-5 ${themeStyles.text}`} />
          <h3 className={`font-semibold text-sm sm:text-base ${themeStyles.text}`}>
            Semana Actual
          </h3>
        </div>
        {(() => {
          // Obtener el inicio de la semana (lunes)
          const today = new Date();
          const currentDay = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
          const diff = currentDay === 0 ? 6 : currentDay - 1; // Ajustar para que el lunes sea el primer día
          
          const monday = new Date(today);
          monday.setDate(today.getDate() - diff);
          monday.setHours(0, 0, 0, 0);
          
          // Obtener el fin de la semana (viernes)
          const friday = new Date(monday);
          friday.setDate(monday.getDate() + 4); // +4 días desde el lunes = viernes
          friday.setHours(23, 59, 59, 999);
          
          return (
            <p className={`text-sm sm:text-base ${themeStyles.text}`}>
              Del {monday.toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} al {friday.toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          );
        })()}
        <p className={`text-sm ${themeStyles.text} mt-2`}>
          Mostrando máximo una solicitud por día (Lunes a Viernes)
        </p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className={`${themeStyles.text}`}>
            No hay solicitudes para esta semana
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {/* Vista móvil */}
          <div className="block md:hidden">
            {solicitudes.map((solicitud) => (
              <div key={solicitud._id} className="p-4 border-b dark:border-gray-700 last:border-b-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">ID</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-mono text-right">{solicitud._id}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Motivo</span>
                    <span className="text-sm text-gray-900 dark:text-white text-right flex-1">{solicitud.motivo}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Inicio</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 text-right">{formatDateLocal(solicitud.fechaInicio)}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Fin</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 text-right">{formatDateLocal(solicitud.fechaFin)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 pt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Estado</span>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(solicitud.estado)}`}>
                      {solicitud.estado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista tablet/desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className={`${themeStyles.background}`}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Motivo</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Inicio</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Fin</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud._id} className={`hover:${themeStyles.background}`}>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {solicitud._id}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {solicitud.motivo}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateLocal(solicitud.fechaInicio)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateLocal(solicitud.fechaFin)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(solicitud.estado)}`}>
                        {solicitud.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySolicitudes; 