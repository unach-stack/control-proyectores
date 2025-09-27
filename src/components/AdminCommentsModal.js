import React, { useState } from 'react';
import { authService } from '../services/authService';
import { X, MessageSquare, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const AdminCommentsModal = ({ show, onClose, solicitud, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [userWantsComments, setUserWantsComments] = useState(false);
  
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Obtener el ID del proyector de manera más robusta
      const proyectorId = solicitud.proyectorId?._id || solicitud.proyectorId;
      
      if (!proyectorId) {
        throw new Error('No se pudo obtener el ID del proyector');
      }

      console.log('Actualizando proyector:', proyectorId, 'a estado: disponible');

      // 1. Cambiar estado del proyector a 'disponible'
      const proyectorResponse = await authService.api.put(`/api/proyectores/${proyectorId}`, {
        estado: 'disponible'
      });

      console.log('Proyector actualizado:', proyectorResponse.data);

      // 2. Actualizar la solicitud con el flag de comentarios
      await authService.api.put(`/solicituds/${solicitud._id}`, {
        estado: 'finalizado',
        userWantsComments: userWantsComments
      });

      // Si el usuario quiere agregar comentarios, enviar notificación
      if (userWantsComments) {
        await authService.api.post('/api/notifications', {
          usuarioId: solicitud.usuarioId._id,
          mensaje: `Tu solicitud de proyector ha sido finalizada. ¿Hubo algún problema con el proyector? Puedes agregar comentarios sobre fallas o problemas técnicos.`,
          tipo: 'comment_request',
          entidadId: solicitud._id,
          entidadTipo: 'Solicitud'
        });
      }

      toast.success(
        userWantsComments 
          ? 'Se ha solicitado comentarios al usuario' 
          : 'Devolución completada sin solicitar comentarios',
        {
          duration: 4000,
          icon: userWantsComments ? '💬' : '✅',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }
      );

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error al procesar devolución:', error);
      toast.error('Error al procesar la devolución');
    } finally {
      setLoading(false);
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
          className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full relative shadow-xl overflow-hidden"
        >
          {/* Header con gradiente del tema */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 flex justify-between items-center`}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Finalizar Devolución
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Información de la Solicitud
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <p><strong>Usuario:</strong> {solicitud?.usuarioId?.nombre}</p>
                <p><strong>Proyector:</strong> {solicitud?.proyectorId?.codigo}</p>
                <p><strong>Fecha:</strong> {new Date(solicitud?.fechaInicio).toLocaleDateString('es-MX')}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ¿El usuario reportó problemas con el proyector?
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="comments"
                    checked={!userWantsComments}
                    onChange={() => setUserWantsComments(false)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-gray-900 dark:text-white">No, el proyector funcionó correctamente</span>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="radio"
                    name="comments"
                    checked={userWantsComments}
                    onChange={() => setUserWantsComments(true)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <MessageSquare className="w-5 h-5 text-orange-500 mr-2" />
                    <span className="text-gray-900 dark:text-white">Sí, solicitar comentarios sobre problemas</span>
                  </div>
                </label>
              </div>
            </div>

            {userWantsComments && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg">
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  <p><strong>Nota:</strong> Se enviará una notificación al usuario para que pueda reportar problemas como:</p>
                  <ul className="mt-2 ml-4 list-disc text-xs">
                    <li>Fallas en el proyector</li>
                    <li>Problemas con cables HDMI o de corriente</li>
                    <li>Calidad de imagen deficiente</li>
                    <li>Otros problemas técnicos</li>
                  </ul>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 
                         text-gray-700 dark:text-gray-300 hover:bg-gray-300 
                         dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-md bg-gradient-to-r ${themeStyles.gradient} 
                         text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar Devolución
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminCommentsModal;
