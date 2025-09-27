import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { alertaError, alertaExito } from './Alert';
import { ArrowLeft, Loader, CheckCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { motion } from 'framer-motion';
import AdminCommentsModal from './AdminCommentsModal';

const DevolverProyectorDirecto = () => {
  const [solicitud, setSolicitud] = useState(null);
  const [proyector, setProyector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
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
        const proyectorId = params.get('proyectorId');

        if (!solicitudId || !proyectorId) {
          throw new Error('Faltan parámetros en la URL');
        }

        // Obtener datos de la solicitud y del proyector
        const [solicitudRes, proyectorRes] = await Promise.all([
          authService.api.get(`/solicitudes/id/${solicitudId}`),
          authService.api.get(`/api/proyectores/${proyectorId}`)
        ]);

        setSolicitud(solicitudRes.data);
        setProyector(proyectorRes.data);

      } catch (err) {
        setError(err.message || 'Error al cargar los datos');
        alertaError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location]);

  const handleConfirmarDevolucion = async () => {
    setShowCommentsModal(true);
  };

  const handleCommentsModalClose = () => {
    setShowCommentsModal(false);
  };

  const handleCommentsModalUpdate = () => {
    navigate('/admin/proyectores');
  };

  const handleVolver = () => navigate(-1);

  if (loading) {
    return <div className="flex flex-col items-center justify-center min-h-screen"><Loader className="animate-spin mb-4"/>Cargando...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6`}>
      <div className="max-w-2xl mx-auto">
        <button onClick={handleVolver} className={`mb-4 flex items-center ${themeStyles.text} hover:opacity-80`}><ArrowLeft className="mr-1" size={16} /> Volver</button>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 sm:p-6`}>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Confirmar Devolución</h1>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-600 dark:text-gray-300">¿Estás seguro de que deseas confirmar la devolución del siguiente proyector?</p>
            <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg space-y-2">
              <p><strong>Proyector:</strong> {proyector?.codigo}</p>
              <p><strong>Solicitante:</strong> {solicitud?.usuarioId?.nombre}</p>
              <p><strong>Fecha de Solicitud:</strong> {new Date(solicitud?.fechaInicio).toLocaleDateString('es-MX')}</p>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={handleConfirmarDevolucion} className={`flex items-center justify-center px-6 py-3 bg-gradient-to-r ${themeStyles.gradient} text-white rounded-lg shadow-md hover:shadow-lg transition-all`}><CheckCircle className="mr-2"/>Confirmar Devolución</button>
            </div>
          </div>
        </motion.div>
      </div>
      
      <AdminCommentsModal
        show={showCommentsModal}
        onClose={handleCommentsModalClose}
        solicitud={solicitud}
        onUpdate={handleCommentsModalUpdate}
      />
    </div>
  );
};

export default DevolverProyectorDirecto;