import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BACKEND_URL } from '../config/config';
import { fetchFromAPI } from '../utils/fetchHelper';
import { useAuth } from '../hooks/useAuth';

const GradeGroupModal = ({ isOpen, onClose }) => {
  const { updateUserData, checkAuth, isAdmin } = useAuth();
  const [grade, setGrade] = useState('');
  const [group, setGroup] = useState('');
  const [shift, setShift] = useState('Matutino');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [errors, setErrors] = useState({ grade: '', group: '' });

  // Si el usuario es administrador, no mostrar el modal
  useEffect(() => {
    if (isAdmin && isOpen) {
      console.log("Usuario administrador - Cerrando modal de grado/grupo");
      onClose();
    }
  }, [isAdmin, isOpen, onClose]);
  
  // Si el usuario es administrador, no renderizar el modal
  if (isAdmin) {
    return null;
  }

  // Función para validar el grado (solo números del 1-9)
  const validateGrade = (value) => {
    if (!value) return 'El grado es obligatorio';
    if (!/^[1-9]$/.test(value)) return 'El grado debe ser un número del 1 al 9';
    return '';
  };

  // Función para validar el grupo (solo una letra A-Z)
  const validateGroup = (value) => {
    if (!value) return 'El grupo es obligatorio';
    if (!/^[a-zA-Z]$/.test(value)) return 'El grupo debe ser una sola letra (A-Z)';
    return '';
  };

  // Manejador para cambio de grado con validación
  const handleGradeChange = (e) => {
    const value = e.target.value;
    setGrade(value);
    setErrors(prev => ({ ...prev, grade: validateGrade(value) }));
  };

  // Manejador para cambio de grupo con validación y conversión a mayúscula
  const handleGroupChange = (e) => {
    const value = e.target.value.toUpperCase(); // Convertir a mayúscula
    setGroup(value);
    setErrors(prev => ({ ...prev, group: validateGroup(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar todos los campos antes de enviar
    const gradeError = validateGrade(grade);
    const groupError = validateGroup(group);
    
    if (gradeError || groupError) {
      setErrors({
        grade: gradeError,
        group: groupError
      });
      
      setAlert({
        show: true,
        message: 'Por favor corrige los errores en el formulario',
        type: 'error'
      });
      
      setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem('jwtToken');
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Si fetchFromAPI ya devuelve el JSON parseado
      const data = await fetchFromAPI('/update-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          grado: grade,
          grupo: group.toUpperCase(),
          turno: shift
        })
      });

      // Actualizar datos del usuario en sessionStorage
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      const updatedUser = {
        ...currentUser,
        grado: grade,
        grupo: group.toUpperCase(),
        turno: shift
      };
      
      // Usar la función del contexto para actualizar los datos
      if (updateUserData) {
        updateUserData(updatedUser);
      } else {
        // Fallback si no está disponible
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
      
      sessionStorage.removeItem('new');
      
      setAlert({
        show: true,
        message: 'Información actualizada correctamente',
        type: 'success'
      });
      
      setTimeout(() => {
        setAlert({ show: false, message: '', type: '' });
        if (onClose) onClose(); // Cerrar el modal
        
        // Forzar una verificación de autenticación para actualizar el estado
        checkAuth();
      }, 2000);
    } catch (error) {
      setAlert({
        show: true,
        message: error.message || 'Ocurrió un error en la solicitud',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Alerta flotante */}
      <AnimatePresence>
        {alert.show && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`
              px-6 py-4 rounded-lg shadow-lg
              ${alert.type === 'success' 
                ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                : 'bg-red-50 border-l-4 border-red-500 text-red-700'}
            `}>
              <div className="flex items-center">
                {alert.type === 'success' ? (
                  <svg className="w-6 h-6 mr-4 text-green-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 mr-4 text-red-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                )}
                <p className="font-medium">{alert.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido del modal (mantener el resto igual pero eliminar el botón cancelar) */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-md" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg"
      >
        <div className="relative bg-white/95 dark:bg-gray-800/95 
                        backdrop-blur-sm rounded-2xl shadow-2xl 
                        border border-gray-100 dark:border-gray-700">
          {/* Header mejorado */}
          <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white 
                           bg-gradient-to-r from-blue-600 to-purple-600 
                           dark:from-blue-400 dark:to-purple-400 
                           bg-clip-text text-transparent">
              Información Académica
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Completa tus datos escolares
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Grado Input mejorado con validación */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Grado Escolar
              </label>
              <input 
                type="text" 
                value={grade} 
                onChange={handleGradeChange}
                className={`w-full px-4 py-3 
                           bg-gray-50 dark:bg-gray-700 
                           border ${errors.grade ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'} 
                           text-gray-900 dark:text-white
                           rounded-xl focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 dark:focus:border-blue-400
                           transition-all duration-200 
                           hover:bg-gray-100 dark:hover:bg-gray-600`}
                placeholder="Ingresa un número del 1 al 9"
                required 
              />
              {errors.grade && (
                <p className="mt-1 text-sm text-red-500">{errors.grade}</p>
              )}
            </div>

            {/* Grupo Input mejorado con validación */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Grupo
              </label>
              <input 
                type="text" 
                value={group} 
                onChange={handleGroupChange}
                className={`w-full px-4 py-3 
                           bg-gray-50 dark:bg-gray-700 
                           border ${errors.group ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'} 
                           text-gray-900 dark:text-white
                           rounded-xl focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 dark:focus:border-blue-400
                           transition-all duration-200 
                           hover:bg-gray-100 dark:hover:bg-gray-600`}
                placeholder="Ingresa una letra (A-Z)"
                required 
              />
              {errors.group && (
                <p className="mt-1 text-sm text-red-500">{errors.group}</p>
              )}
            </div>

            {/* Turno Select mejorado */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Turno
              </label>
              <select 
                value={shift} 
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-4 py-3 
                           bg-gray-50 dark:bg-gray-700 
                           border border-gray-200 dark:border-gray-600 
                           text-gray-900 dark:text-white
                           rounded-xl focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 dark:focus:border-blue-400
                           transition-all duration-200 
                           hover:bg-gray-100 dark:hover:bg-gray-600"
                required
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
              </select>
            </div>

            {/* Botones (solo mantener el botón de guardar) */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading || errors.grade || errors.group}
                className={`w-full px-6 py-3 
                           text-sm font-medium text-white 
                           bg-gradient-to-r from-blue-600 to-purple-600 
                           rounded-xl hover:from-blue-700 hover:to-purple-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           transition-all duration-200
                           ${(loading || errors.grade || errors.group) ? 'opacity-50 cursor-not-allowed' : ''}
                           ${loading ? 'animate-pulse' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default GradeGroupModal;
