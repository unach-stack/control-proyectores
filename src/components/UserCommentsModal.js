import React, { useState } from 'react';
import { authService } from '../services/authService';
import { X, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const UserCommentsModal = ({ show, onClose, solicitud, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [selectedIssues, setSelectedIssues] = useState([]);
  
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const commonIssues = [
    { id: 'hdmi', label: 'Cable HDMI no funciona', icon: '🔌' },
    { id: 'power', label: 'Cable de corriente defectuoso', icon: '⚡' },
    { id: 'image', label: 'Imagen no es nítida', icon: '📺' },
    { id: 'sound', label: 'Problemas de audio', icon: '🔊' },
    { id: 'overheat', label: 'Proyector se sobrecalienta', icon: '🌡️' },
    { id: 'remote', label: 'Control remoto no funciona', icon: '📱' },
    { id: 'focus', label: 'Problemas de enfoque', icon: '🎯' },
    { id: 'other', label: 'Otro problema', icon: '❓' }
  ];

  const handleIssueToggle = (issueId) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const handleSubmit = async () => {
    if (!comments.trim() && selectedIssues.length === 0) {
      toast.error('Por favor, selecciona al menos un problema o escribe comentarios adicionales');
      return;
    }

    try {
      setLoading(true);

      const commentData = {
        solicitudId: solicitud._id,
        proyectorId: solicitud.proyectorId._id || solicitud.proyectorId,
        issues: selectedIssues,
        comments: comments.trim(),
        timestamp: new Date()
      };

      // Enviar comentarios al backend
      await authService.api.post('/api/proyector-comments', commentData);

      // Actualizar la solicitud para marcar que se agregaron comentarios
      await authService.api.put(`/solicituds/${solicitud._id}/comments-added`);

      toast.success('¡Comentarios enviados correctamente!', {
        duration: 4000,
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error al enviar comentarios:', error);
      toast.error('Error al enviar comentarios');
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
          className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full relative shadow-xl overflow-hidden"
        >
          {/* Header con gradiente del tema */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 flex justify-between items-center`}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Reportar Problemas del Proyector
            </h2>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Información de la Solicitud
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <p><strong>Proyector:</strong> {solicitud?.proyectorId?.codigo}</p>
                <p><strong>Fecha de uso:</strong> {new Date(solicitud?.fechaInicio).toLocaleDateString('es-MX')}</p>
                <p><strong>Motivo:</strong> {solicitud?.motivo}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ¿Qué problemas presentó el proyector?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecciona todos los problemas que hayas observado:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonIssues.map(issue => (
                  <label
                    key={issue.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200
                             ${selectedIssues.includes(issue.id)
                               ? `border-orange-500 bg-orange-50 dark:bg-orange-900/20`
                               : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                             }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIssues.includes(issue.id)}
                      onChange={() => handleIssueToggle(issue.id)}
                      className="mr-3 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-lg mr-2">{issue.icon}</span>
                    <span className="text-gray-900 dark:text-white text-sm">{issue.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Comentarios Adicionales
              </h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe con más detalle los problemas encontrados, cuándo ocurrieron, y cualquier información adicional que pueda ser útil para el mantenimiento..."
                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-gray-50 dark:bg-gray-700 
                         text-gray-900 dark:text-gray-100
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
                         focus:ring-orange-500 dark:focus:ring-orange-600
                         focus:border-transparent transition-all duration-200 resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {comments.length}/500 caracteres
              </p>
            </div>

            {(selectedIssues.length > 0 || comments.trim()) && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Gracias por reportar estos problemas
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Tu información ayudará a mejorar el mantenimiento de los proyectores y la experiencia de otros usuarios.
                    </p>
                  </div>
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
                disabled={loading || (!comments.trim() && selectedIssues.length === 0)}
                className={`flex items-center gap-2 px-6 py-2 rounded-md bg-gradient-to-r ${themeStyles.gradient} 
                         text-white hover:opacity-90 transition-opacity disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Reporte
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

export default UserCommentsModal;
