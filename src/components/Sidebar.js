import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaCog, FaTv, FaFileUpload, FaHistory, FaQrcode } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import ThemeSelector from './ThemeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const NAV_ITEMS = [
  { path: '/',                  icon: FaHome,       label: 'Dashboard'         },
  { path: '/request-projector', icon: FaTv,         label: 'Solicitar Proyector' },
  { path: '/upload-documents',  icon: FaFileUpload, label: 'Subir Documentos'  },
  { path: '/mis-solicitudes',   icon: FaHistory,    label: 'Mis Solicitudes'   },
  { path: '/qr-history',        icon: FaQrcode,     label: 'Mis Códigos QR'    },
];

const Sidebar = ({ openGradeGroupModal }) => {
  const [isOpen, setIsOpen]                 = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { darkMode, toggleDarkMode, currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const location    = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleDarkModeToggle = async () => {
    try { await toggleDarkMode(!darkMode); }
    catch (error) { console.error('Error al cambiar modo oscuro:', error); }
  };

  return (
    <>
      {/* ── Botón hamburger / X ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className={`fixed top-4 left-4 z-50 lg:hidden
                    bg-gradient-to-br ${themeStyles.gradient}
                    p-3 rounded-2xl shadow-xl`}
        style={{ boxShadow: '0 0 20px rgba(0,0,0,0.25)' }}
      >
        <motion.div
          animate={isOpen ? 'open' : 'closed'}
          className="w-5 h-5 flex flex-col justify-center items-center gap-1"
        >
          <motion.span
            variants={{ closed: { rotate: 0, y: 0 }, open: { rotate: 45, y: 6 } }}
            transition={{ duration: 0.25 }}
            className="block w-5 h-0.5 bg-white rounded-full origin-center"
          />
          <motion.span
            variants={{ closed: { opacity: 1, scaleX: 1 }, open: { opacity: 0, scaleX: 0 } }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-0.5 bg-white rounded-full"
          />
          <motion.span
            variants={{ closed: { rotate: 0, y: 0 }, open: { rotate: -45, y: -6 } }}
            transition={{ duration: 0.25 }}
            className="block w-5 h-0.5 bg-white rounded-full origin-center"
          />
        </motion.div>
      </motion.button>

      {/* ── Overlay móvil ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 z-40
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0`}
      >
        {/* Fondo glassmorphism sobre gradiente */}
        <div className={`h-full flex flex-col bg-gradient-to-b ${themeStyles.sidebarGradient || 'from-blue-700 to-blue-900'} relative overflow-hidden`}>

          {/* Orb decorativo de fondo */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          {/* ── Header / Brand ── */}
          <div className="relative px-5 pt-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {/* Orb vivo */}
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${themeStyles.gradient}
                             flex items-center justify-center shadow-lg shrink-0`}
              >
                <FaTv className="text-white text-sm" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm leading-tight truncate">
                  Control de
                </p>
                <p className="text-white/60 font-semibold text-xs truncate">
                  Proyectores UNACH
                </p>
              </div>
            </div>
          </div>

          {/* ── Navegación ── */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto
                          scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsOpen(false)}
                >
                  <motion.div
                    whileHover={{ x: active ? 0 : 4, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200
                                ${active
                                  ? 'bg-white/15 shadow-inner'
                                  : 'hover:bg-white/8 text-white/80 hover:text-white'}`}
                  >
                    {/* Glow bar izquierda */}
                    {active && (
                      <motion.div
                        layoutId="user-active-bar"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]`}
                      />
                    )}

                    {/* Ícono */}
                    <motion.div
                      animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                  ${active ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}
                    >
                      <Icon className={`text-sm ${active ? 'text-white' : 'text-white/70'}`} />
                    </motion.div>

                    <span className={`font-semibold text-sm truncate ${active ? 'text-white' : 'text-white/75'}`}>
                      {label}
                    </span>

                    {/* Dot activo */}
                    {active && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* ── Footer / Configuración ── */}
          <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">

            {/* Toggle modo oscuro */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-white/80 text-sm font-medium">Modo oscuro</span>
              <ThemeToggle isDark={darkMode} toggleTheme={handleDarkModeToggle} />
            </div>

            {/* Botón personalización */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left
                          ${showThemeSelector ? 'bg-white/15' : 'hover:bg-white/8'}`}
            >
              <motion.div
                animate={{ rotate: showThemeSelector ? 180 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"
              >
                <FaCog className="text-white/80 text-sm" />
              </motion.div>
              <span className="text-white/80 font-semibold text-sm">Personalización</span>
              {showThemeSelector && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
              )}
            </motion.button>

            {/* Selector de temas */}
            <AnimatePresence>
              {showThemeSelector && (
                <motion.div
                  key="theme-selector"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 rounded-xl bg-black/15 backdrop-blur-sm
                                  max-h-48 overflow-y-auto
                                  scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                    <ThemeSelector />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
