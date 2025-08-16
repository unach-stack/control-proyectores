import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Projector, Edit2, Trash2, Plus, Search, X, Check, AlertTriangle } from 'lucide-react';
import { alertaExito, alertaError } from './Alert';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const AdminProyectores = () => {
  const [proyectores, setProyectores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proyectorEditar, setProyectorEditar] = useState(null);
  const [proyectorToDelete, setProyectorToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('todos');
  const [formData, setFormData] = useState({
    codigo: '',
    grado: '',
    grupo: '',
    turno: 'Matutino',
    estado: 'disponible'
  });
  
  // Obtener el tema actual
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    fetchProyectores();
  }, []);

  const fetchProyectores = async () => {
    try {
      setLoading(true);
      const response = await authService.api.get('/api/proyectores');
      setProyectores(response.data);
      setError(null);
    } catch (error) {
      console.error('Error al cargar proyectores:', error);
      setError('Error al cargar los proyectores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (proyectorEditar) {
      setFormData({
        codigo: proyectorEditar.codigo || '',
        grado: proyectorEditar.grado || '',
        grupo: proyectorEditar.grupo || '',
        turno: proyectorEditar.turno || 'Matutino',
        estado: proyectorEditar.estado || 'disponible'
      });
    } else {
      setFormData({
        codigo: '',
        grado: '',
        grupo: '',
        turno: 'Matutino',
        estado: 'disponible'
      });
    }
  }, [proyectorEditar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (proyectorEditar) {
        // Actualizar proyector existente
        await authService.api.put(`/api/proyectores/${proyectorEditar._id}`, formData);
        alertaExito('Proyector actualizado correctamente');
      } else {
        // Crear nuevo proyector
        await authService.api.post('/api/proyectores', formData);
        alertaExito('Proyector creado correctamente');
      }
      
      // Recargar la lista de proyectores
      fetchProyectores();
      setShowModal(false);
      setProyectorEditar(null);
    } catch (error) {
      console.error('Error al guardar proyector:', error);
      alertaError(error.response?.data?.message || 'Error al guardar el proyector');
    }
  };

  const handleEditar = (proyector) => {
    setProyectorEditar(proyector);
    setShowModal(true);
  };

  const handleBorrar = (proyector) => {
    setProyectorToDelete(proyector);
    setShowDeleteModal(true);
  };

  const confirmarBorrado = async () => {
    try {
      await authService.api.delete(`/api/proyectores/${proyectorToDelete._id}`);
      alertaExito('Proyector eliminado correctamente');
      fetchProyectores();
      setShowDeleteModal(false);
      setProyectorToDelete(null);
    } catch (error) {
      console.error('Error al eliminar proyector:', error);
      alertaError(error.response?.data?.message || 'Error al eliminar el proyector');
    }
  };

  // Filtrar proyectores según búsqueda y filtro de turno
  const filteredProyectores = proyectores.filter(proyector => {
    const matchesSearch = 
      proyector.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proyector.grado.toString().includes(searchTerm) ||
      proyector.grupo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTurno = turnoFilter === 'todos' || proyector.turno === turnoFilter;
    
    return matchesSearch && matchesTurno;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${themeStyles.gradient} flex items-center justify-center`}>
          <div className="w-10 h-10 border-4 border-white dark:border-gray-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className={`text-2xl font-bold leading-7 ${themeStyles.text} sm:text-3xl sm:truncate`}>
              Gestión de Proyectores
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Administra los proyectores del sistema
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => {
                setShowModal(true);
                setProyectorEditar(null);
              }}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r ${themeStyles.gradient} hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Proyector
            </button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Búsqueda existente */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-5 w-5 ${themeStyles.text} opacity-60`} />
              </div>
              <input
                type="text"
                className={`block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${themeStyles.focusRing} focus:border-transparent sm:text-sm transition-all duration-200`}
                placeholder="Buscar proyector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filtro por turno */}
          <div className="md:w-48">
            <select
              value={turnoFilter}
              onChange={(e) => setTurnoFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-200"
            >
              <option value="todos">Todos los turnos</option>
              <option value="Matutino">Matutino</option>
              <option value="Vespertino">Vespertino</option>
            </select>
          </div>
        </div>

        {/* Grid de Proyectores */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProyectores.map((proyector) => (
            <motion.div
              key={proyector._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
            >
              {/* Fondo con gradiente sutil */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${themeStyles.gradient}`}></div>
              
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r ${themeStyles.gradient} text-white shadow-sm`}>
                      <Projector className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-medium ${themeStyles.text}`}>
                        {proyector.codigo}
                      </h3>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditar(proyector)}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${themeStyles.text}`}
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleBorrar(proyector)}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-500 dark:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Grado</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${themeStyles.background} ${themeStyles.text}`}>
                      {proyector.grado}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Grupo</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${themeStyles.background} ${themeStyles.text}`}>
                      {proyector.grupo}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Turno</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      proyector.turno === 'Matutino'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                    }`}>
                      {proyector.turno}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Estado</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        proyector.estado === 'disponible'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : proyector.estado === 'en uso'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {proyector.estado}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredProyectores.length === 0 && !loading && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <Search className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No se encontraron proyectores
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No hay proyectores que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo proyector.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Edición/Creación */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                {/* Header con gradiente */}
                <div className={`bg-gradient-to-r ${themeStyles.gradient} p-5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">
                      {proyectorEditar ? 'Editar Proyector' : 'Nuevo Proyector'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setProyectorEditar(null);
                      }}
                      className="rounded-full p-1 bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="space-y-4">
                    {/* Campo Código */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Código
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Projector className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={formData.codigo}
                          onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                          required
                          placeholder="Ej: PRY-5e-9786"
                        />
                      </div>
                    </div>

                    {/* Campos Grado y Grupo en fila */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Grado
                        </label>
                        <input
                          type="text"
                          value={formData.grado}
                          onChange={(e) => setFormData({...formData, grado: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                          required
                          placeholder="Ej: 5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Grupo
                        </label>
                        <input
                          type="text"
                          value={formData.grupo}
                          onChange={(e) => setFormData({...formData, grupo: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                          required
                          placeholder="Ej: A"
                        />
                      </div>
                    </div>

                    {/* Campo Turno */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Turno
                      </label>
                      <select
                        value={formData.turno}
                        onChange={(e) => setFormData({...formData, turno: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                        required
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                      </select>
                    </div>

                    {/* Campo Estado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                        required
                      >
                        <option value="disponible">Disponible</option>
                        <option value="en uso">En uso</option>
                        <option value="mantenimiento">Mantenimiento</option>
                      </select>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setProyectorEditar(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md bg-gradient-to-r ${themeStyles.gradient} hover:shadow-md transition-all duration-300 transform hover:scale-105`}
                    >
                      {proyectorEditar ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-full p-3 mr-4">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Eliminar Proyector
                    </h3>
                  </div>
                  
                  <div className="mt-2 mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ¿Estás seguro de que deseas eliminar el proyector{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {proyectorToDelete?.codigo}
                      </span>
                      ? Esta acción no se puede deshacer.
                    </p>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmarBorrado}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProyectores; 