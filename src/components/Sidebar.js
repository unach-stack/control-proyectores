import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUserFriends, FaCog, FaTv, FaFileUpload, FaBars, FaTimes, FaHistory, FaQrcode } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import ThemeSelector from './ThemeSelector';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const Sidebar = ({ openGradeGroupModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { darkMode, toggleDarkMode, currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const location = useLocation();
  
  // Determinar si un enlace está activo
  const isActive = (path) => location.pathname === path;
  
  // Clases dinámicas basadas en el tema actual
  const linkClasses = (path) => 
    isActive(path) 
      ? `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 
         bg-gradient-to-r ${themeStyles.gradient} text-white font-semibold` 
      : `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 
         hover:bg-gradient-to-r hover:from-white/5 hover:to-white/20 
         hover:scale-105 hover:shadow-md hover:shadow-black/10`;
  
  const iconClasses = "text-xl";

  const handleDarkModeToggle = async () => {
    try {
      await toggleDarkMode(!darkMode);
    } catch (error) {
      console.error('Error al cambiar modo oscuro:', error);
    }
  };

  return (
    <>
      {/* Botón hamburguesa con gradiente y glow */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className={`fixed top-4 left-4 z-50 
                    bg-gradient-to-r ${themeStyles.gradient}
                    p-3 rounded-xl lg:hidden
                    shadow-[0_0_15px_rgba(59,130,246,0.5)]
                    hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]
                    hover:scale-110
                    transition-all duration-300`}
        >
          <FaBars className="text-white w-5 h-5" />
        </button>
      )}

      {/* Overlay para cerrar el sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden 
                    transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar con gradiente del tema actual */}
      <div className={`fixed top-0 left-0 h-screen 
                      bg-gradient-to-b ${themeStyles.sidebarGradient || 'from-blue-700 to-blue-900'} 
                      dark:from-gray-800 dark:to-gray-900
                      text-white shadow-xl z-40 transition-all duration-300
                      ${isOpen ? 'w-[65vw] sm:w-56 translate-x-0' : '-translate-x-full w-[65vw] sm:w-56'} 
                      lg:translate-x-0 lg:w-56`}>
        {/* Header con gradiente de texto y efecto hover */}
        <div className="p-3 border-b border-white/10">
          <h1 className={`text-xl font-bold bg-gradient-to-r from-white to-${currentTheme === 'default' ? 'blue-200' : 
                         currentTheme === 'purple' ? 'purple-200' : 
                         currentTheme === 'green' ? 'emerald-200' : 
                         currentTheme === 'ocean' ? 'cyan-200' : 
                         currentTheme === 'sunset' ? 'orange-200' : 'blue-200'} 
                         dark:from-${currentTheme === 'default' ? 'blue-400' : 
                                    currentTheme === 'purple' ? 'purple-400' : 
                                    currentTheme === 'green' ? 'emerald-400' : 
                                    currentTheme === 'ocean' ? 'cyan-400' : 
                                    currentTheme === 'sunset' ? 'orange-400' : 'blue-400'} 
                         dark:to-${currentTheme === 'default' ? 'blue-200' : 
                                  currentTheme === 'purple' ? 'purple-200' : 
                                  currentTheme === 'green' ? 'emerald-200' : 
                                  currentTheme === 'ocean' ? 'cyan-200' : 
                                  currentTheme === 'sunset' ? 'orange-200' : 'blue-200'} 
                         bg-clip-text text-transparent
                         hover:scale-105 transition-transform duration-300 cursor-default`}>
            Control de Proyectores
          </h1>
        </div>

        {/* Navigation con scrollbar personalizada según el tema */}
        <nav className={`flex-1 p-2 space-y-1 overflow-y-auto 
                       scrollbar-thin scrollbar-thumb-${currentTheme === 'default' ? 'blue-400' : 
                                                      currentTheme === 'purple' ? 'purple-400' : 
                                                      currentTheme === 'green' ? 'emerald-400' : 
                                                      currentTheme === 'ocean' ? 'cyan-400' : 
                                                      currentTheme === 'sunset' ? 'orange-400' : 'blue-400'} 
                       dark:scrollbar-thumb-gray-600 scrollbar-track-transparent`}>
          
          {/* Enlaces con indicador de activo usando gradiente y efectos hover */}
          <Link to="/" 
                className={linkClasses("/")} 
                onClick={() => setIsOpen(false)}>
            <div className={`${isActive("/") 
              ? `p-1 rounded-full bg-gradient-to-r ${themeStyles.gradient}` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaHome className={`${iconClasses} ${isActive("/") ? "" : "group-hover:scale-110 transition-transform duration-300"}`} />
            </div>
            <span className="font-medium">Dashboard</span>
            {isActive("/") && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${themeStyles.gradient}`}></div>
            )}
          </Link>
          
          <Link to="/request-projector" 
                className={`${linkClasses("/request-projector")} group`} 
                onClick={() => setIsOpen(false)}>
            <div className={`${isActive("/request-projector") 
              ? `p-1 rounded-full bg-gradient-to-r ${themeStyles.gradient}` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaTv className={`${iconClasses} ${isActive("/request-projector") ? "" : "group-hover:scale-110 transition-transform duration-300"}`} />
            </div>
            <span className="font-medium">Solicitar Proyector</span>
            {isActive("/request-projector") && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${themeStyles.gradient}`}></div>
            )}
          </Link>
          
          <Link to="/upload-documents" 
                className={`${linkClasses("/upload-documents")} group`} 
                onClick={() => setIsOpen(false)}>
            <div className={`${isActive("/upload-documents") 
              ? `p-1 rounded-full bg-gradient-to-r ${themeStyles.gradient}` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaFileUpload className={`${iconClasses} ${isActive("/upload-documents") ? "" : "group-hover:scale-110 transition-transform duration-300"}`} />
            </div>
            <span className="font-medium">Subir Documentos</span>
            {isActive("/upload-documents") && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${themeStyles.gradient}`}></div>
            )}
          </Link>
          
          <Link to="/mis-solicitudes" 
                className={`${linkClasses("/mis-solicitudes")} group`} 
                onClick={() => setIsOpen(false)}>
            <div className={`${isActive("/mis-solicitudes") 
              ? `p-1 rounded-full bg-gradient-to-r ${themeStyles.gradient}` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaHistory className={`${iconClasses} ${isActive("/mis-solicitudes") ? "" : "group-hover:scale-110 transition-transform duration-300"}`} />
            </div>
            <span className="font-medium">Mis Solicitudes</span>
            {isActive("/mis-solicitudes") && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${themeStyles.gradient}`}></div>
            )}
          </Link>
          
          <Link to="/qr-history" 
                className={`${linkClasses("/qr-history")} group`} 
                onClick={() => setIsOpen(false)}>
            <div className={`${isActive("/qr-history") 
              ? `p-1 rounded-full bg-gradient-to-r ${themeStyles.gradient}` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaQrcode className={`${iconClasses} ${isActive("/qr-history") ? "" : "group-hover:scale-110 transition-transform duration-300"}`} />
            </div>
            <span className="font-medium">Mis Códigos QR</span>
            {isActive("/qr-history") && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${themeStyles.gradient}`}></div>
            )}
          </Link>
        </nav>

        {/* Footer con controles de tema y efectos hover */}
        <div className="p-2 border-t border-white/10 space-y-2 overflow-visible">
          <div className={`flex items-center justify-between p-2 rounded-lg bg-white/5 
                         hover:bg-white/10 transition-colors duration-300`}>
            <span className="font-medium">Modo Oscuro</span>
            <ThemeToggle 
              isDark={darkMode} 
              toggleTheme={handleDarkModeToggle}
            />
          </div>
          
          <button 
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 
                      w-full text-left group
                      ${showThemeSelector 
                        ? `bg-gradient-to-r ${themeStyles.gradient}` 
                        : 'hover:bg-gradient-to-r hover:from-white/5 hover:to-white/20'}`}
          >
            <div className={`${showThemeSelector 
              ? `p-1 rounded-full bg-white/20` 
              : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
              <FaCog className={`${iconClasses} ${showThemeSelector ? "animate-spin" : "group-hover:scale-110 transition-transform duration-300"}`} 
                    style={{ animationDuration: '3s' }} />
            </div>
            <span className="font-medium">Personalización</span>
            {showThemeSelector && (
              <div className={`ml-auto w-1.5 h-6 rounded-full bg-white/50`}></div>
            )}
          </button>
          
          {/* Selector de Temas con animación y scroll mejorado */}
          {showThemeSelector && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-2 p-2 rounded-lg bg-gradient-to-br from-black/20 to-white/5 backdrop-blur-sm
                        max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent`}
            >
              <ThemeSelector />
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
