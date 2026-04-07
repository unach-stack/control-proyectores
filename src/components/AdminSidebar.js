import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Projector, FileBarChart, AlertTriangle, Settings, UsersRound, ClipboardCheck } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ThemeSelector from './ThemeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const NAV_ITEMS = [
  { path: '/admin-dashboard',   icon: LayoutDashboard, label: 'Dashboard'           },
  { path: '/user-requests',     icon: FolderKanban,    label: 'Solicitudes'         },
  { path: '/admin-proyectores', icon: Projector,       label: 'Gestión Proyectores' },
  { path: '/faulty-projectors', icon: AlertTriangle,   label: 'Con Problemas'       },
  { path: '/admin-encargados',   icon: UsersRound,      label: 'Encargados'          },
  { path: '/admin-correcciones', icon: ClipboardCheck,  label: 'Correcciones'        },
  { path: '/reports',            icon: FileBarChart,    label: 'Reportes'            },
];

const AdminSidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isOpen, setIsOpen]                     = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { darkMode, toggleDarkMode, currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

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
            key="admin-overlay"
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
        className={`fixed top-0 left-0 h-screen w-64 z-40
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0`}
      >
        <div className={`h-full flex flex-col bg-gradient-to-b ${themeStyles.sidebarGradient || 'from-blue-700 to-blue-900'} relative overflow-hidden`}>

          {/* Orbs decorativos */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-16 -left-12 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-32 h-32 rounded-full bg-white/3 blur-2xl pointer-events-none" />

          {/* ── Header / Brand ── */}
          <div className="relative px-5 pt-6 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className={`w-10 h-10 rounded-xl bg-gradient-to-br from-white/25 to-white/10
                             flex items-center justify-center shadow-lg border border-white/20 shrink-0`}
              >
                <LayoutDashboard className="text-white w-5 h-5" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm leading-tight">
                  Panel Admin
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  />
                  <p className="text-white/50 text-xs font-medium">UNACH · Activo</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Navegación ── */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto
                          scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">

            <p className="px-3 mb-2 text-white/35 text-[10px] font-bold uppercase tracking-[0.12em]">
              Menú principal
            </p>

            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <motion.div
                  key={path}
                  whileHover={{ x: active ? 0 : 4, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  onClick={() => { navigate(path); setIsOpen(false); }}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                               transition-colors duration-150
                               ${active
                                 ? 'bg-white/15 shadow-inner'
                                 : 'hover:bg-white/8 text-white/80 hover:text-white'}`}
                >
                  {/* Barra activa izquierda */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        key={`bar-${path}`}
                        layoutId="admin-active-bar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.5)]"
                      />
                    )}
                  </AnimatePresence>

                  {/* Ícono */}
                  <motion.div
                    animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                ${active
                                  ? 'bg-white/20 shadow-inner'
                                  : 'bg-white/5'}`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-white/65'}`} />
                  </motion.div>

                  <span className={`font-semibold text-sm truncate
                                    ${active ? 'text-white' : 'text-white/70'}`}>
                    {label}
                  </span>

                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    />
                  )}
                </motion.div>
              );
            })}
          </nav>

          {/* ── Footer ── */}
          <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">

            {/* Modo oscuro */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-white/80 text-sm font-medium">Modo oscuro</span>
              <ThemeToggle isDark={darkMode} toggleTheme={handleDarkModeToggle} />
            </div>

            {/* Personalización */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left
                          ${showThemeSelector ? 'bg-white/15' : 'hover:bg-white/8'}`}
            >
              <motion.div
                animate={{ rotate: showThemeSelector ? 90 : 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"
              >
                <Settings className="text-white/80 w-4 h-4" />
              </motion.div>
              <span className="text-white/80 font-semibold text-sm">Personalización</span>
              {showThemeSelector && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70"
                />
              )}
            </motion.button>

            {/* Theme selector */}
            <AnimatePresence>
              {showThemeSelector && (
                <motion.div
                  key="admin-theme-selector"
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

export default AdminSidebar;
