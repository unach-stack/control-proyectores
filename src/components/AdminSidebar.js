import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  FolderKanban,
  Menu,
  X,
  Monitor,
  Projector,
  Settings,
  FileBarChart,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ThemeSelector from './ThemeSelector';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { darkMode, toggleDarkMode, currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  // Determinar si un enlace está activo
  const isActive = (path) => currentPath === path;

  const handleDarkModeToggle = async () => {
    try {
      await toggleDarkMode(!darkMode);
    } catch (error) {
      console.error('Error al cambiar modo oscuro:', error);
    }
  };

  const NavItem = ({ path, icon: Icon, children }) => {
    const active = isActive(path);
    
    return (
      <div 
        onClick={() => {
          navigate(path);
          setIsOpen(false);
        }} 
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group
                   ${active 
                     ? `bg-gradient-to-r ${themeStyles.gradient} text-white font-semibold` 
                     : 'hover:bg-gradient-to-r hover:from-white/5 hover:to-white/20 hover:scale-105 hover:shadow-md hover:shadow-black/10'}`}
      >
        <div className={`${active 
          ? `p-1 rounded-full bg-white/20` 
          : "p-1 rounded-full transition-all duration-300 group-hover:bg-white/20"}`}>
          {Icon && <Icon className={`w-5 h-5 text-white ${!active && "group-hover:scale-110 transition-transform duration-300"}`} />}
        </div>
        <span className="font-medium text-white">{children}</span>
        {active && (
          <div className={`ml-auto w-1.5 h-6 rounded-full bg-white/50`}></div>
        )}
      </div>
    );
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
          <Menu className="text-white w-5 h-5" />
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
                      ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full w-64'} 
                      lg:translate-x-0 lg:w-64`}>
        
        {/* Header con gradiente de texto y efecto hover */}
        <div className="p-4 border-b border-white/10">
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
            Panel de Administración
          </h1>
        </div>

        {/* Navigation con scrollbar personalizada según el tema */}
        <nav className={`flex-1 p-4 space-y-2 overflow-y-auto 
                       scrollbar-thin scrollbar-thumb-${currentTheme === 'default' ? 'blue-400' : 
                                                      currentTheme === 'purple' ? 'purple-400' : 
                                                      currentTheme === 'green' ? 'emerald-400' : 
                                                      currentTheme === 'ocean' ? 'cyan-400' : 
                                                      currentTheme === 'sunset' ? 'orange-400' : 'blue-400'} 
                       dark:scrollbar-thumb-gray-600 scrollbar-track-transparent`}>
          <NavItem path="/admin-dashboard" icon={LayoutDashboard}>
            Dashboard
          </NavItem>
          
          <NavItem path="/user-requests" icon={FolderKanban}>
            Solicitudes por Usuario
          </NavItem>
          
          <NavItem path="/admin-proyectores" icon={Projector}>
            Gestión de Proyectores
          </NavItem>
          
          <NavItem path="/reports" icon={FileBarChart}>
            Reportes y Estadísticas
          </NavItem>
        </nav>

        {/* Footer con controles de tema y efectos hover */}
        <div className="p-4 border-t border-white/10 space-y-2 overflow-visible">
          <div className={`flex items-center justify-between p-2 rounded-lg bg-white/5 
                         hover:bg-white/10 transition-colors duration-300`}>
            <span className="font-medium text-white">Modo Oscuro</span>
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
              <Settings className={`w-5 h-5 text-white ${showThemeSelector ? "animate-spin" : "group-hover:scale-110 transition-transform duration-300"}`} 
                      style={{ animationDuration: '3s' }} />
            </div>
            <span className="font-medium text-white">Personalización</span>
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

export default AdminSidebar;
