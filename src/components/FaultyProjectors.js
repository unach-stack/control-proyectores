import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { AlertTriangle, Search, Filter, Calendar, User, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import toast from 'react-hot-toast';

const FaultyProjectors = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedComments, setExpandedComments] = useState(new Set());
  
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await authService.api.get('/api/proyector-comments');
      setComments(response.data);
    } catch (err) {
      setError('Error al cargar comentarios de proyectores');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (commentId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const markAsResolved = async (commentId) => {
    try {
      await authService.api.put(`/api/proyector-comments/${commentId}`, {
        status: 'resolved'
      });
      
      toast.success('Problema marcado como resuelto');
      fetchComments();
    } catch (err) {
      toast.error('Error al marcar como resuelto');
      console.error('Error:', err);
    }
  };

  const getIssueIcon = (issueId) => {
    const icons = {
      'hdmi': '🔌',
      'power': '⚡',
      'image': '📺',
      'sound': '🔊',
      'overheat': '🌡️',
      'remote': '📱',
      'focus': '🎯',
      'other': '❓'
    };
    return icons[issueId] || '❓';
  };

  const getIssueLabel = (issueId) => {
    const labels = {
      'hdmi': 'Cable HDMI',
      'power': 'Cable de corriente',
      'image': 'Imagen no nítida',
      'sound': 'Problemas de audio',
      'overheat': 'Sobrecalentamiento',
      'remote': 'Control remoto',
      'focus': 'Problemas de enfoque',
      'other': 'Otro problema'
    };
    return labels[issueId] || 'Problema desconocido';
  };

  const filteredComments = comments.filter(comment => {
    const matchesSearch = 
      comment.proyectorId?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.userId?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.comments?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'pending' && comment.status === 'pending') ||
      (filterStatus === 'resolved' && comment.status === 'resolved');
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${themeStyles.border}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <div className="mb-6">
        <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 ${themeStyles.text} flex items-center gap-2`}>
          <AlertTriangle className="w-6 h-6" />
          Proyectores con Problemas Reportados
        </h2>
        
        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por proyector, usuario o comentario..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="resolved">Resueltos</option>
            </select>
          </div>
        </div>
      </div>

      {filteredComments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className={`${themeStyles.text}`}>
            {searchTerm || filterStatus !== 'all' 
              ? 'No se encontraron comentarios que coincidan con los filtros'
              : 'No hay problemas reportados en los proyectores'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r ${themeStyles.gradient} text-white font-bold`}>
                      {comment.proyectorId?.codigo?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {comment.proyectorId?.codigo || 'Proyector no encontrado'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Reportado por: {comment.userId?.nombre || 'Usuario desconocido'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      comment.status === 'resolved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    }`}>
                      {comment.status === 'resolved' ? 'Resuelto' : 'Pendiente'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(comment.timestamp).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>

                {/* Problemas reportados */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Problemas reportados:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {comment.issues?.map((issueId) => (
                      <span
                        key={issueId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-xs"
                      >
                        <span>{getIssueIcon(issueId)}</span>
                        {getIssueLabel(issueId)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Comentarios adicionales */}
                {comment.comments && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Comentarios adicionales:
                      </h4>
                      <button
                        onClick={() => toggleExpanded(comment._id)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {expandedComments.has(comment._id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 ${
                      expandedComments.has(comment._id) ? '' : 'max-h-20 overflow-hidden'
                    }`}>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.comments}
                      </p>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                {comment.status === 'pending' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => markAsResolved(comment._id)}
                      className={`px-4 py-2 rounded-md bg-gradient-to-r ${themeStyles.gradient} text-white hover:opacity-90 transition-opacity`}
                    >
                      Marcar como Resuelto
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FaultyProjectors;
