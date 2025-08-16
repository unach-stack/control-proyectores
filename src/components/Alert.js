import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import ReactDOM from 'react-dom/client';
import { alertService } from '../services/alertService';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentThemeStyles } from '../themes/themeConfig';

// Componente base para la notificación tipo toast sin depender de useTheme
const Toast = ({ open, handleClose, severity, message, themeStyles }) => {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        handleClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [open, handleClose]);

  if (!open) return null;

  const severityStyles = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-300'
  };

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 left-4 sm:left-auto z-50"
    >
      <div className={`flex items-center p-3 sm:p-4 rounded-lg border ${severityStyles[severity]} shadow-lg backdrop-blur-sm w-full sm:w-auto sm:min-w-[320px] sm:max-w-md`}>
        <div className="flex-shrink-0">
          {iconMap[severity]}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-xs sm:text-sm font-medium break-words">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="ml-4 flex-shrink-0 rounded-md p-1.5 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Componente Modal sin depender de useTheme
const Modal = ({ isOpen, onClose, title, message, icon, confirmButtonText, themeStyles }) => {
  if (!isOpen) return null;

  // Usar un gradiente predeterminado si no hay themeStyles
  const gradient = themeStyles?.gradient || 'from-blue-600 to-blue-800';
  const buttonGradient = themeStyles?.gradient || 'from-blue-600 to-blue-800';

  const iconComponents = {
    success: (
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 animate-bounce" />
      </div>
    ),
    error: (
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 animate-pulse" />
      </div>
    ),
    info: (
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 mx-auto">
        <Info className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
      </div>
    ),
    warning: (
      <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-4 mx-auto">
        <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-pulse" />
      </div>
    )
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header con gradiente */}
          <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
            <h3 className="text-lg font-medium text-center">
              {title}
            </h3>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col items-center">
              {iconComponents[icon]}
              
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {message}
                </p>
              </div>
            </div>
            
            <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className={`px-6 py-2 text-sm font-medium text-white rounded-md bg-gradient-to-r ${buttonGradient} hover:shadow-md transition-all duration-300 transform hover:scale-105`}
              >
                {confirmButtonText || 'Aceptar'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Función para obtener el tema actual del localStorage
const getCurrentTheme = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'blue';
  }
  return 'blue';
};

// Exportar funciones de alerta
export const alertaExito = (mensaje = 'Operación exitosa') => {
  const alertId = `success-${mensaje}`;
  
  if (!alertService.canShowAlert(alertId)) {
    return;
  }
  
  const modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);

  const cleanup = () => {
    document.body.removeChild(modalRoot);
  };

  const App = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    // Obtener el tema actual y sus estilos
    const currentTheme = getCurrentTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    const handleClose = () => {
      setIsOpen(false);
      setTimeout(cleanup, 300);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Éxito"
        message={mensaje}
        icon="success"
        confirmButtonText="Aceptar"
        themeStyles={themeStyles}
      />
    );
  };

  const root = ReactDOM.createRoot(modalRoot);
  root.render(<App />);
};

export const alertaEliminacion = (cantidadEliminados) => {
  const modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);

  const cleanup = () => {
    document.body.removeChild(modalRoot);
  };

  const App = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    // Obtener el tema actual y sus estilos
    const currentTheme = getCurrentTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    const handleClose = () => {
      setIsOpen(false);
      setTimeout(cleanup, 300);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Elementos eliminados"
        message={`${cantidadEliminados} elemento(s) han sido eliminados correctamente.`}
        icon="info"
        confirmButtonText="Aceptar"
        themeStyles={themeStyles}
      />
    );
  };

  const root = ReactDOM.createRoot(modalRoot);
  root.render(<App />);
};

export const alertaError = (mensaje = 'Ha ocurrido un error') => {
  const alertId = `error-${mensaje}`;
  
  if (!alertService.canShowAlert(alertId)) {
    return;
  }
  
  const modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);

  const cleanup = () => {
    document.body.removeChild(modalRoot);
  };

  const App = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    // Obtener el tema actual y sus estilos
    const currentTheme = getCurrentTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    const handleClose = () => {
      setIsOpen(false);
      setTimeout(cleanup, 300);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Error"
        message={mensaje}
        icon="error"
        confirmButtonText="Aceptar"
        themeStyles={themeStyles}
      />
    );
  };

  const root = ReactDOM.createRoot(modalRoot);
  root.render(<App />);
};

export const alertaAdvertencia = (mensaje) => {
  const modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);

  const cleanup = () => {
    document.body.removeChild(modalRoot);
  };

  const App = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    // Obtener el tema actual y sus estilos
    const currentTheme = getCurrentTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    const handleClose = () => {
      setIsOpen(false);
      setTimeout(cleanup, 300);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Advertencia"
        message={mensaje}
        icon="warning"
        confirmButtonText="Aceptar"
        themeStyles={themeStyles}
      />
    );
  };

  const root = ReactDOM.createRoot(modalRoot);
  root.render(<App />);
};

export const alertaPersonalizada = (titulo, texto, icono) => {
  const modalRoot = document.createElement('div');
  document.body.appendChild(modalRoot);

  const cleanup = () => {
    document.body.removeChild(modalRoot);
  };

  const App = () => {
    const [isOpen, setIsOpen] = React.useState(true);
    // Obtener el tema actual y sus estilos
    const currentTheme = getCurrentTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    const handleClose = () => {
      setIsOpen(false);
      setTimeout(cleanup, 300);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={titulo}
        message={texto}
        icon={icono}
        confirmButtonText="Aceptar"
        themeStyles={themeStyles}
      />
    );
  };

  const root = ReactDOM.createRoot(modalRoot);
  root.render(<App />);
};

// Componente principal para notificaciones tipo toast
const CustomAlert = ({ open, handleClose, severity, message }) => {
  // Obtener el tema actual y sus estilos
  const currentTheme = getCurrentTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  
  return (
    <Toast
      open={open}
      handleClose={handleClose}
      severity={severity}
      message={message}
      themeStyles={themeStyles}
    />
  );
};

export default CustomAlert;
