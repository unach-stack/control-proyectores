import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { motion } from 'framer-motion';
import { Check, X, Clock, Calendar, User, BookOpen, QrCode } from 'lucide-react';
import { useTimeZone } from '../contexts/TimeZoneContext';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { QRCodeCanvas } from 'qrcode.react';
import { alertaError } from './Alert';

// Modal para mostrar el QR
const QRDisplayModal = ({ show, handleClose, qrData, title, themeStyles }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 flex justify-between items-center`}>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={handleClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 flex flex-col items-center justify-center">
          {qrData ? (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeCanvas value={qrData} size={256} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No hay código QR para mostrar.</p>
          )}
          <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-4">
            {title === 'Código QR para Devolución' 
              ? 'Muestra este código al administrador para devolver el proyector.'
              : 'Muestra este código al administrador para recibir tu proyector.'
            }
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const MySolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalContent, setQrModalContent] = useState({ data: null, title: '' });

  const { formatDate } = useTimeZone();
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const formatDateLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleShowQR = async (solicitud) => {
    // Si la solicitud está aprobada pero no tenemos el proyectorId, lo buscamos.
    if (solicitud.estado === 'aprobado' && !solicitud.proyectorId) {
      try {
        setQrModalContent({ data: null, title: 'Cargando QR...' });
        setShowQRModal(true);

        const response = await authService.api.get(`/solicitudes/id/${solicitud._id}`);
        const fullSolicitud = response.data;

        if (fullSolicitud.proyectorId) {
          const qrData = JSON.stringify({
            type: 'devolucion',
            solicitudId: fullSolicitud._id,
            proyectorId: fullSolicitud.proyectorId._id || fullSolicitud.proyectorId
          });
          setQrModalContent({ data: qrData, title: 'Código QR para Devolución' });
        } else {
          setShowQRModal(false);
          alertaError('Error: No se encontró proyector asignado a esta solicitud.');
        }
      } catch (error) {
        setShowQRModal(false);
        alertaError('No se pudieron obtener los detalles para el QR.');
      }
      return;
    }

    // Lógica original para solicitudes pendientes o ya completas
    let qrData = null;
    let qrTitle = '';

    if (solicitud.estado === 'aprobado' && solicitud.proyectorId) {
      qrData = JSON.stringify({
        type: 'devolucion',
        solicitudId: solicitud._id,
        proyectorId: solicitud.proyectorId._id || solicitud.proyectorId
      });
      qrTitle = 'Código QR para Devolución';
    } else if (solicitud.estado === 'pendiente') {
      qrData = JSON.stringify({
        type: 'asignacion',
        solicitudId: solicitud._id
      });
      qrTitle = 'Código QR de Asignación';
    }

    if (qrData) {
      setQrModalContent({ data: qrData, title: qrTitle });
      setShowQRModal(true);
    }
  };

  useEffect(() => {
    const fetchMySolicitudes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authService.api.get('/mis-solicitudes');
        
        // Nuevo filtrado: semana actual + siguiente
        const now = new Date();
        const startOfWeek = (date) => {
          const d = new Date(date);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          return new Date(d.setDate(diff));
        };
        const mondayThisWeek = startOfWeek(now);
        mondayThisWeek.setHours(0, 0, 0, 0);

        const sundayNextWeek = new Date(mondayThisWeek);
        sundayNextWeek.setDate(mondayThisWeek.getDate() + 13);
        sundayNextWeek.setHours(23, 59, 59, 999);

        const filteredData = response.data.filter(solicitud => {
            const fechaInicio = new Date(solicitud.fechaInicio);
            return fechaInicio >= mondayThisWeek && fechaInicio <= sundayNextWeek;
        });

        const sortedData = filteredData.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)); // Ordenar de más antigua a más nueva
        setSolicitudes(sortedData);

      } catch (error) {
        setError('Error al cargar tus solicitudes: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };
    fetchMySolicitudes();
  }, []);

  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'aprobado': return `${themeStyles.background} ${themeStyles.text}`;
      case 'rechazado': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      case 'finalizado': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${themeStyles.border}`} /></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">{error}</div></div>;

  return (
    <div className="w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 ${themeStyles.text}`}>
        Mis Solicitudes
      </h2>
      
      <QRDisplayModal 
        show={showQRModal} 
        handleClose={() => setShowQRModal(false)} 
        qrData={qrModalContent.data} 
        title={qrModalContent.title}
        themeStyles={themeStyles}
      />

      {solicitudes.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow"><p className={`${themeStyles.text}`}>No tienes solicitudes recientes.</p></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {/* Vista móvil */}
          <div className="block md:hidden">
            {solicitudes.map((solicitud) => (
              <div key={solicitud._id} className="p-4 border-b dark:border-gray-700 last:border-b-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4"><span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Proyector</span><span className="text-sm text-gray-700 dark:text-gray-300 font-mono text-right">{solicitud.proyectorId?.codigo || '--'}</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Inicio</span><span className="text-sm text-gray-700 dark:text-gray-300 text-right">{formatDateLocal(solicitud.fechaInicio)}</span></div>
                  <div className="flex justify-between items-center gap-4 pt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Estado</span>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(solicitud.estado)}`}>{solicitud.estado}</span>
                  </div>
                  {(solicitud.estado === 'aprobado' || solicitud.estado === 'pendiente') && (
                    <div className="pt-2 flex justify-end">
                      <button onClick={() => handleShowQR(solicitud)} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r ${themeStyles.gradient} text-white`}><QrCode size={14}/> Ver QR</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vista tablet/desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
              <thead className={`${themeStyles.background}`}>
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proyector</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Inicio</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Fin</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud._id} className={`hover:${themeStyles.background}`}>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{solicitud.proyectorId?.codigo || 'Sin asignar'}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDateLocal(solicitud.fechaInicio)}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDateLocal(solicitud.fechaFin)}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(solicitud.estado)}`}>{solicitud.estado}</span></td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {(solicitud.estado === 'aprobado' || solicitud.estado === 'pendiente') && (
                        <button onClick={() => handleShowQR(solicitud)} className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-gradient-to-r ${themeStyles.gradient} text-white`}><QrCode size={14}/> Ver QR</button>
                      )}
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