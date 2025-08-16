import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTv, faClockRotateLeft, faFileUpload, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';
import useShowGradeGroupModal from '../hooks/useShowGradeGroupModal';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

function Dashboard({ isAuthenticated, isAdmin, setShowGradeGroupModal }) {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Escuchar cambios de tema
  useEffect(() => {
    const handleThemeChange = (event) => {
      setForceUpdate(prev => prev + 1);
      // Forzar re-render de los componentes que usan gradientes
      document.documentElement.setAttribute('data-theme', event.detail);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Forzar re-render cuando cambia el tema
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [currentTheme]);

  // Usar el custom hook
  useShowGradeGroupModal(isAuthenticated, isAdmin, setShowGradeGroupModal);
  const [stats, setStats] = useState({
    solicitudesActivas: 0,
    misSolicitudes: 0
  });
 
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await authService.api.get('/dashboard-stats');
        setStats({
          solicitudesActivas: response.data.solicitudesActivas || 0,
          misSolicitudes: response.data.misSolicitudes || 0
        });
      } catch (error) {
        console.error('Error al obtener estadísticas:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen w-full">
      <div className="w-full max-w-[2412px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Panel de Control de Proyectores
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <DashboardCard 
            icon={faClockRotateLeft}
            title="Mis Solicitudes"
            value={stats.misSolicitudes}
            description="Historial personal"
            themeStyles={themeStyles}
          />
          <DashboardCard 
            icon={faChalkboardTeacher}
            title="Solicitudes Activas"
            value={stats.solicitudesActivas}
            description="En curso"
            themeStyles={themeStyles}
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-700/20 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ActionButton 
              to="/request-projector" 
              label="Solicitar Proyector"
              icon={faTv}
            />
            <ActionButton 
              to="/mis-solicitudes" 
              label="Mis Solicitudes"
              icon={faClockRotateLeft}
            />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-700/20 p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Solicitudes Activas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <th className="p-3 text-gray-700 dark:text-gray-200">Fecha</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Horario</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Estado</th>
                </tr>
              </thead>
              <tbody className="dark:text-gray-300">
                {stats.solicitudesActivas > 0 ? (
                  <TableRow 
                    date={new Date().toLocaleDateString()}
                    schedule="En curso"
                    status="Activo"
                  />
                ) : (
                  <tr>
                    <td colSpan="3" className="p-3 text-center text-gray-500 dark:text-gray-400">
                      No hay solicitudes activas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, description, themeStyles }) {
  return (
    <div className={`bg-gradient-to-r ${themeStyles.gradient} rounded-lg shadow-md 
                    dark:shadow-gray-700/20 p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm opacity-80">{description}</p>
        </div>
        <FontAwesomeIcon icon={icon} size="3x" className="opacity-50" />
      </div>
    </div>
  );
}

function ActionButton({ to, label, icon }) {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  return (
    <Link 
      to={to} 
      className={`flex items-center justify-center gap-2
                 bg-gradient-to-r ${themeStyles.gradient}
                 text-white py-3 px-4 rounded-xl
                 transition duration-300 text-center
                 shadow-md hover:shadow-lg
                 ${themeStyles.hover}
                 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800`}
    >
      <FontAwesomeIcon icon={icon} />
      <span>{label}</span>
    </Link>
  );
}

function TableRow({ date, subject, schedule, status }) {
  const statusStyles = {
    Pendiente: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    Aprobado: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    Rechazado: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  }[status];
  
  return (
    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="p-3">{date}</td>
      <td className="p-3">{subject}</td>
      <td className="p-3">{schedule}</td>
      <td className="p-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}

export default Dashboard;
