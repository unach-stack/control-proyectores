import React from 'react';
import { motion } from 'framer-motion';

const WelcomeAlert = ({ isOpen, onClose, openGradeGroupModal }) => {
  if (!isOpen) return null;

  const handleCompleteProfile = () => {
    openGradeGroupModal(); // Abre el modal de información académica
    onClose(); // Cierra el modal de bienvenida
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
      {/* Overlay con efecto de desenfoque */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
      >
        <div className="p-6 md:p-8">
          {/* Icono de bienvenida */}
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>

          {/* Título con gradiente */}
          <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ¡Bienvenido!
          </h2>

          {/* Contenido */}
          <div className="space-y-4 text-center">
            <p className="text-gray-600">
              Para comenzar a utilizar el sistema de préstamo de proyectores, necesitamos algunos datos académicos.
            </p>
            <p className="text-gray-500 text-sm">
              Esta información nos ayudará a gestionar mejor las solicitudes de préstamo.
            </p>
          </div>

          {/* Botones */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleCompleteProfile}
              className="w-full px-6 py-3 text-white font-medium bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <span>Completar Información</span>
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            
            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-gray-600 font-medium bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200"
            >
              Completar más tarde
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeAlert;
