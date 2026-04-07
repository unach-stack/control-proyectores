import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTv, faUsers, faClipboardList, faBell, faCheck, faTimes, faEdit } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [encargadoStats, setEncargadoStats] = useState(null);
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    const fetchSolicitudes = async () => {
      try {
        const response = await authService.api.get('/solicitudes');
        setRequests(response.data);
      } catch (error) {
        // silently ignore
      }
    };

    const fetchEncargadoStats = async () => {
      try {
        const response = await authService.api.get('/api/admin/encargado-stats');
        setEncargadoStats(response.data);
      } catch (error) {
        // silently ignore
      }
    };

    fetchSolicitudes();
    fetchEncargadoStats();
  }, []);

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const response = await authService.api.put(`/solicituds/${requestId}`, { 
        estado: newStatus 
      });
      
      if (response.data.solicitud) {
        setRequests(requests.map(request => 
          request._id === requestId ? { ...request, estado: newStatus } : request
        ));
        
        toast.success(`Solicitud ${newStatus} exitosamente`);
      }
    } catch (error) {
      toast.error('Error al actualizar el estado de la solicitud');
    }
  };

  // Obtener solo las últimas 5 solicitudes, ordenadas por fecha
  const latestRequests = [...requests]
    .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
    .slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen p-8">
      <h1 className={`text-3xl font-bold ${themeStyles.text} mb-6`}>Panel de Administración</h1>
      
      {/* Resumen - Cards con gradientes del tema actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard 
          icon={faTv}
          title="Proyectores Totales"
          value="20"
          description="En inventario"
          color={`bg-gradient-to-r ${themeStyles.gradient}`}
        />
        <DashboardCard 
          icon={faUsers}
          title="Solicitudes Pendientes"
          value={requests.filter(r => r.estado === 'pendiente').length.toString()}
          description="Por revisar"
          color="bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600"
        />
        <DashboardCard 
          icon={faClipboardList}
          title="Préstamos Activos"
          value={requests.filter(r => r.estado === 'aprobado').length.toString()}
          description="En uso"
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <DashboardCard 
          icon={faBell}
          title="Alertas"
          value="3"
          description="Requieren atención"
          color="bg-gradient-to-r from-red-500 to-red-600"
        />
      </div>
      
      {encargadoStats && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Encargados esta semana</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total grupos', value: encargadoStats.totalGrupos, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-white dark:bg-gray-800' },
              { label: 'Con encargado', value: encargadoStats.gruposConEncargado, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Sin encargado', value: encargadoStats.sinEncargado, color: encargadoStats.sinEncargado > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400', bg: encargadoStats.sinEncargado > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800' },
              { label: 'Postulaciones pendientes', value: encargadoStats.postulacionesPendientes, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Sustituciones este mes', value: encargadoStats.sustitucionesDelMes, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center`}>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
          {encargadoStats.ausentesEstaSemana > 0 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ {encargadoStats.ausentesEstaSemana} encargado{encargadoStats.ausentesEstaSemana > 1 ? 's' : ''} marcado{encargadoStats.ausentesEstaSemana > 1 ? 's' : ''} como ausente esta semana
            </p>
          )}
        </div>
      )}

      {/* Solicitudes Recientes - Diseño mejorado con tema actual */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-semibold ${themeStyles.text}`}>Últimas Solicitudes</h2>
          <Link 
            to="/user-requests" 
            className={`${themeStyles.text} hover:opacity-80 text-sm font-medium transition-colors`}
          >
            Ver todas las solicitudes →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 
                           uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 
                           uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 
                           uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 
                           uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {latestRequests.map(request => (
                <TableRow 
                  key={request._id} 
                  request={request} 
                  onStatusChange={handleStatusChange} 
                  themeStyles={themeStyles}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, description, color }) {
  return (
    <div className={`${color} rounded-lg shadow-md p-6 text-white hover:shadow-lg transition-shadow duration-300 hover:scale-105 transform transition-transform`}>
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

function TableRow({ request, onStatusChange, themeStyles }) {
  const statusStyles = {
    pendiente: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    aprobado: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    rechazado: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
  };
  
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-10 w-10 rounded-full 
                       flex items-center justify-center bg-gradient-to-r ${themeStyles.gradient}`}>
            <span className="text-white font-medium">
              {request.usuarioId?.nombre.charAt(0)}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {request.usuarioId?.nombre}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {request.usuarioId?.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {new Date(request.fechaInicio).toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(request.fechaInicio).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[request.estado]}`}>
          {request.estado}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex space-x-3">
          <button 
            onClick={() => onStatusChange(request._id, 'aprobado')} 
            className="text-green-600 hover:text-green-900 transition-colors hover:scale-125 transform"
            title="Aprobar solicitud"
          >
            <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onStatusChange(request._id, 'rechazado')} 
            className="text-red-600 hover:text-red-900 transition-colors hover:scale-125 transform"
            title="Rechazar solicitud"
          >
            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {}}
            className={`${themeStyles.text} hover:opacity-80 transition-colors hover:scale-125 transform`}
            title="Editar solicitud"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default AdminDashboard;