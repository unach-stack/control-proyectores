import React, { useState, useEffect } from 'react';
import { FiDownload, FiShare2, FiCalendar, FiClock, FiInfo } from 'react-icons/fi';
import { fetchFromAPI } from '../utils/fetchHelper';
import { alertaError, alertaExito } from './Alert';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const QRHistory = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedQRs, setGroupedQRs] = useState({});
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Obtener el tema actual
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    const fetchQRCodes = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = sessionStorage.getItem('jwtToken');
        
        if (!token) {
          console.error('No hay token disponible');
          alertaError('No hay sesión activa');
          setLoading(false);
          return;
        }

        // Intentar obtener QRs del servidor primero
        try {
          const response = await fetchFromAPI('/qr-codes/user', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Respuesta del servidor:', response);

          if (response && Array.isArray(response.qrCodes)) {
            setQrCodes(response.qrCodes);
            
            // Agrupar QRs por fecha
            const grouped = response.qrCodes.reduce((acc, qr) => {
              const date = new Date(qr.createdAt).toISOString().split('T')[0];
              if (!acc[date]) acc[date] = [];
              acc[date].push(qr);
              return acc;
            }, {});
            
            setGroupedQRs(grouped);
          }
        } catch (error) {
          console.error('Error al obtener QRs del servidor:', error);
        }

        // Si no hay QRs del servidor, usar el temporal
        if (qrCodes.length === 0) {
          const tempQrData = sessionStorage.getItem('lastGeneratedQR');
          if (tempQrData) {
            const tempQR = {
              _id: 'temp-' + Date.now(),
              qrData: tempQrData,
              createdAt: new Date().toISOString(),
              userId: user?._id
            };
            setQrCodes([tempQR]);
            setGroupedQRs({ [new Date().toISOString().split('T')[0]]: [tempQR] });
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error general:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchQRCodes();
  }, [user]);

  const handleDownloadQR = (qrData) => {
    try {
      console.log('Iniciando descarga de QR');
      
      if (!qrData) {
        console.error('No hay datos para generar QR');
        alertaError('No hay datos para generar el código QR');
        return;
      }
      
      // Usar la URL del backend para generar QR
      const qrUrl = `${process.env.REACT_APP_BACKEND_URL}/generate-qr?data=${encodeURIComponent(qrData)}&size=300x300&margin=10`;
      console.log('URL del QR generada', qrUrl);
      
      // Detectar si es dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`Dispositivo detectado: ${isMobile ? 'móvil' : 'desktop'}`);
      
      if (isMobile) {
        // En móviles, abrir el QR en una nueva ventana/pestaña
        console.log('Abriendo QR en nueva ventana para dispositivo móvil');
        const newWindow = window.open(qrUrl, '_blank');
        
        if (!newWindow) {
          console.error('No se pudo abrir ventana, posiblemente bloqueada por popup blocker');
          alertaError('No se pudo abrir la ventana. Intenta desactivar el bloqueador de ventanas emergentes.');
        } else {
          console.log('Ventana abierta con éxito');
        }
      } else {
        // En desktop, intenta descargar directamente
        console.log('Iniciando descarga directa para desktop');
        
        // Método fetch para descargar la imagen
        fetch(qrUrl)
          .then(response => response.blob())
          .then(blob => {
            console.log('Imagen descargada como blob');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'qr-solicitud-proyector.png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('Descarga completada');
          })
          .catch(err => {
            console.error('Error al descargar la imagen', err);
            alertaError('Error al descargar la imagen QR');
          });
      }
    } catch (error) {
      console.error('Error al descargar QR:', error);
      alertaError('Error al descargar el código QR');
    }
  };

  const handleShareQR = async (qrData) => {
    try {
      if (!navigator.share) {
        alertaError('Tu navegador no soporta la función de compartir');
        return;
      }

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=300x300&margin=10`;
      
      await navigator.share({
        title: 'Mi código QR de solicitud de proyector',
        text: 'Aquí está mi código QR para la solicitud de proyector',
        url: qrUrl
      });
      
      console.log('QR compartido exitosamente');
    } catch (error) {
      console.error('Error al compartir:', error);
      alertaError('Error al compartir el QR');
    }
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString('es-ES', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${themeStyles.border}`}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
          <div className={`${themeStyles.background} p-2 rounded-full mr-3`}>
            <FiInfo className={`h-5 w-5 ${themeStyles.text}`} />
          </div>
          Historial de Códigos QR
        </h2>

        {/* Información sobre los QR */}
        <div className={`mb-6 p-4 ${themeStyles.background} rounded-lg border ${themeStyles.border}`}>
          <div className="flex items-start">
            <FiInfo className={`h-5 w-5 ${themeStyles.text} mt-0.5 mr-3`} />
            <div>
              <h3 className={`font-medium ${themeStyles.text}`}>Información sobre tus códigos QR</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Aquí encontrarás todos los códigos QR generados para tus solicitudes de proyector.
                Puedes descargarlos o compartirlos directamente desde esta página.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
            <div className="flex items-start">
              <FiInfo className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-medium text-yellow-700 dark:text-yellow-300">Información para desarrolladores</h3>
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  {error}
                </p>
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  Es posible que necesites implementar el endpoint /qr-codes/user en el backend.
                </p>
              </div>
            </div>
          </div>
        )}

        {Object.keys(groupedQRs).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              No tienes códigos QR generados. Solicita un proyector para generar tu primer código QR.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedQRs)
              .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA)) // Ordenar por fecha descendente
              .map(([date, qrList]) => (
                <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 text-white`}>
                    <h3 className="font-semibold flex items-center">
                      <FiCalendar className="mr-2" />
                      {formatDate(date)}
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {qrList.map((qr, index) => {
                        // Parsear los datos del QR
                        let qrInfo;
                        try {
                          qrInfo = JSON.parse(qr.qrData);
                        } catch (e) {
                          qrInfo = { solicitudId: 'Error', fechas: [] };
                        }
                        
                        return (
                          <div key={qr._id || index} className="border dark:border-gray-700 rounded-lg p-4 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                  <FiClock className="mr-1" />
                                  {formatTime(qr.createdAt)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  ID: {qrInfo.solicitudId}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleDownloadQR(qr.qrData)}
                                  className={`p-2 ${themeStyles.background} ${themeStyles.text} rounded-full hover:bg-opacity-80`}
                                  title="Descargar QR"
                                >
                                  <FiDownload size={16} />
                                </button>
                                {navigator.share && (
                                  <button
                                    onClick={() => handleShareQR(qr.qrData)}
                                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-800/50"
                                    title="Compartir QR"
                                  >
                                    <FiShare2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex-grow flex items-center justify-center p-2">
                              <div className={`p-3 rounded-lg ${themeStyles.background}`}>
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr.qrData)}&size=150x150&margin=10`} 
                                  alt="QR Code"
                                  className="w-[150px] h-[150px]"
                                />
                              </div>
                            </div>
                            
                            {qrInfo.fechas && qrInfo.fechas.length > 0 && (
                              <div className="mt-3 text-sm">
                                <p className={`font-medium ${themeStyles.text} mb-1`}>Fechas solicitadas:</p>
                                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                  {qrInfo.fechas.map((f, i) => (
                                    <li key={i} className="flex justify-between">
                                      <span>{f.fecha}</span>
                                      <span>{f.horaInicio} - {f.horaFin}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRHistory; 