import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Check, Edit, AlertCircle, Eye, Trash2, Minus, Plus, Calendar } from 'lucide-react';
import { authService } from '../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi'; // Importar icono de recarga
import AsignarProyectorModal from './AsignarProyectorModal';
import { Temporal } from '@js-temporal/polyfill';
import { useTimeZone } from '../contexts/TimeZoneContext';
import { alertaExito, alertaError } from './Alert';
import { fetchFromAPI } from '../utils/fetchHelper';
import { BACKEND_URL } from '../config/config';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faEdit, faSearch, faFilter, faSort, faEye } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const UserRequests = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [pdfPreviewModal, setPdfPreviewModal] = useState({
    show: false,
    url: ''
  });
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [error, setError] = useState(null);
  
  // Nuevos estados para manejar los datos
  const [solicitudes, setSolicitudes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [usuariosSolicitudes, setUsuariosSolicitudes] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const qrSolicitudId = queryParams.get('solicitudId');
  const qrUsuarioId = queryParams.get('usuarioId');

  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const targetTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const fetchSolicitudes = async () => {
    try {
      setIsLoading(true);
      const response = await authService.api.get('/solicitudes');
      
      // Procesar y organizar los datos
      const userMap = response.data.reduce((acc, solicitud) => {
        if (!solicitud.usuarioId) return acc;
        
        if (!acc[solicitud.usuarioId._id]) {
          acc[solicitud.usuarioId._id] = {
            userData: solicitud.usuarioId,
            solicitudes: [],
            documentos: []
          };
        }
        acc[solicitud.usuarioId._id].solicitudes.push(solicitud);
        return acc;
      }, {});

      setUsers(Object.values(userMap));
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      setError('No se pudieron cargar las solicitudes. Por favor, intenta de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Si hay parámetros de QR, buscar y seleccionar automáticamente
    if (qrSolicitudId && qrUsuarioId) {
      handleQrScan(qrSolicitudId, qrUsuarioId);
    }
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.userData.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userData.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  // Función para obtener el inicio de la semana usando Date en lugar de Temporal
  const startOfWeek = (date) => {
    // Crear una copia de la fecha
    const result = new Date(date);
    // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const day = result.getDay();
    // Calcular cuántos días restar para llegar al lunes
    // Si es domingo (0), restar 6 días para llegar al lunes anterior
    // Si es otro día, restar (día - 1) días
    const diff = day === 0 ? 6 : day - 1;
    // Restar los días necesarios
    result.setDate(result.getDate() - diff);
    // Establecer la hora a 00:00:00
    result.setHours(0, 0, 0, 0);
    return result;
  };

  // Función para obtener el fin de la semana
  const endOfWeek = (date) => {
    // Obtener el inicio de la semana
    const start = startOfWeek(date);
    // Crear una copia y añadir 6 días para llegar al domingo
    const result = new Date(start);
    result.setDate(start.getDate() + 6);
    // Establecer la hora a 23:59:59
    result.setHours(23, 59, 59, 999);
    return result;
  };

  // Función para verificar si una fecha está dentro de un intervalo
  const isWithinInterval = (date, interval) => {
    // Convertir todo a objetos Date para comparación
    const checkDate = date instanceof Date ? date : new Date(date);
    const start = interval.start instanceof Date ? interval.start : new Date(interval.start);
    const end = interval.end instanceof Date ? interval.end : new Date(interval.end);
    
    // Normalizar las fechas estableciendo la hora a mediodía para evitar problemas de zona horaria
    checkDate.setHours(12, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Comparar las fechas
    return checkDate >= start && checkDate <= end;
  };

  // Función para obtener las solicitudes de la semana actual
  const obtenerSolicitudesSemanaActual = (solicitudes) => {
    // Obtener los límites de la semana actual
    const now = new Date();
    const monday = startOfWeek(now);
    const sunday = endOfWeek(now);
    
    // Filtrar las solicitudes que están dentro de la semana actual
    return solicitudes.filter(solicitud => {
      const fechaInicio = new Date(solicitud.fechaInicio);
      return isWithinInterval(fechaInicio, { start: monday, end: sunday });
    });
  };

  // Función para agrupar solicitudes por usuario
  const agruparSolicitudesPorUsuario = (solicitudes, usuarios) => {
    console.log("Agrupando solicitudes por usuario");
    console.log("Solicitudes recibidas:", solicitudes.length);
    console.log("Usuarios recibidos:", usuarios.length);
    
    // Crear un mapa para almacenar las solicitudes por usuario
    const usuarioMap = {};
    
    // Procesar cada solicitud
    solicitudes.forEach(solicitud => {
      // Verificar si la solicitud tiene un usuarioId válido
      if (!solicitud.usuarioId) {
        console.warn("Solicitud sin usuarioId:", solicitud._id);
        return;
      }
      
      // Obtener el ID del usuario
      const usuarioId = typeof solicitud.usuarioId === 'object' 
        ? solicitud.usuarioId._id 
        : solicitud.usuarioId;
      
      // Buscar el usuario correspondiente
      const usuario = usuarios.find(u => u._id === usuarioId);
      
      if (!usuario) {
        console.warn(`Usuario no encontrado para solicitud ${solicitud._id} (usuarioId: ${usuarioId})`);
        return;
      }
      
      // Inicializar el objeto del usuario si no existe
      if (!usuarioMap[usuarioId]) {
        usuarioMap[usuarioId] = {
          userData: usuario,
          solicitudes: []
        };
      }
      
      // Agregar la solicitud al usuario
      usuarioMap[usuarioId].solicitudes.push(solicitud);
    });
    
    // Convertir el mapa a un array
    const resultado = Object.values(usuarioMap);
    console.log("Usuarios con solicitudes:", resultado.length);
    
    return resultado;
  };

  // Función para ordenar solicitudes por fecha (más recientes primero)
  const ordenarSolicitudesPorFecha = (solicitudes) => {
    return [...solicitudes].sort((a, b) => {
      const fechaA = new Date(a.fechaInicio);
      const fechaB = new Date(b.fechaInicio);
      return fechaB - fechaA; // Orden descendente (más recientes primero)
    });
  };

  // Función para cargar los datos
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Iniciando carga de datos para administrador");
      
      // Verificar la autenticación antes de hacer las solicitudes
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const token = sessionStorage.getItem('jwtToken');
      
      if (!currentUser || !currentUser._id || !token) {
        throw new Error('Sesión no válida. Por favor, inicia sesión nuevamente.');
      }
      
      // Obtener las solicitudes usando el helper
      const solicitudesData = await fetchFromAPI('/solicitudes');
      console.log("Solicitudes obtenidas:", solicitudesData?.length || 0);
      
      // Obtener los usuarios
      const usuariosData = await fetchFromAPI('/usuarios');
      console.log("Usuarios obtenidos:", usuariosData?.length || 0);
      
      // Intentar obtener los documentos, pero manejar el caso de que la ruta no exista
      let documentosData = [];
      try {
        documentosData = await fetchFromAPI('/documentos');
        console.log("Documentos obtenidos:", documentosData?.length || 0);
      } catch (docError) {
        console.warn("No se pudieron obtener los documentos:", docError.message);
        console.log("Continuando sin datos de documentos");
        // Continuar sin datos de documentos
        documentosData = [];
      }
      
      // Verificar si hay datos
      if (!solicitudesData || solicitudesData.length === 0) {
        console.log("No hay solicitudes disponibles");
        setUsuariosSolicitudes([]);
        setFilteredUsers([]);
        setIsLoading(false);
        return;
      }
      
      // Agrupar las solicitudes por usuario
      const solicitudesPorUsuario = agruparSolicitudesPorUsuario(solicitudesData, usuariosData);
      console.log("Solicitudes agrupadas por usuario:", solicitudesPorUsuario.length);
      
      // Agregar los documentos a cada usuario solo si hay documentos
      if (documentosData && documentosData.length > 0) {
        documentosData.forEach(documento => {
          if (!documento || !documento.usuarioId) return;
          
          const usuarioId = documento.usuarioId;
          const usuario = solicitudesPorUsuario.find(u => 
            u.userData && u.userData._id === usuarioId
          );
          
          if (usuario) {
            if (!usuario.documentos) {
              usuario.documentos = [];
            }
            usuario.documentos.push(documento);
          }
        });
      } else {
        // Si no hay documentos, asegurarse de que cada usuario tenga un array de documentos vacío
        solicitudesPorUsuario.forEach(usuario => {
          usuario.documentos = [];
        });
      }
      
      // Ordenar las solicitudes por fecha (más recientes primero)
      const solicitudesOrdenadas = ordenarSolicitudesPorFecha(solicitudesData);
      setSolicitudes(solicitudesOrdenadas);
      
      // Actualizar el estado
      setUsuarios(usuariosData);
      setDocumentos(documentosData);
      setUsuariosSolicitudes(solicitudesPorUsuario);
      
      // Filtrar los usuarios que tienen solicitudes en la semana actual
      const solicitudesSemanaActual = obtenerSolicitudesSemanaActual(solicitudesData);
      console.log("Solicitudes de la semana actual:", solicitudesSemanaActual.length);
      
      const usuariosConSolicitudesSemanaActual = solicitudesPorUsuario.filter(usuario => {
        return usuario.solicitudes.some(solicitud => 
          solicitudesSemanaActual.some(s => s._id === solicitud._id)
        );
      });
      
      console.log("Usuarios con solicitudes esta semana:", usuariosConSolicitudesSemanaActual.length);
      setFilteredUsers(usuariosConSolicitudesSemanaActual);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError(error.message || 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = async (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setActiveTab('solicitudes');
    
    // Si el usuario no tiene documentos, intentar cargarlos directamente
    if (!user.documentos || user.documentos.length === 0) {
      try {
        console.log("Intentando cargar documentos para el usuario:", user.userData._id);
        const response = await authService.api.get(`/documentos/usuario/${user.userData._id}`);
        
        if (response.data && Array.isArray(response.data)) {
          console.log("Documentos obtenidos directamente:", response.data.length);
          
          // Actualizar el usuario seleccionado con los documentos
          setSelectedUser(prevUser => ({
            ...prevUser,
            documentos: response.data
          }));
          
          // También actualizar en la lista de usuarios con solicitudes
          setUsuariosSolicitudes(prevUsers => {
            return prevUsers.map(u => {
              if (u.userData._id === user.userData._id) {
                return {
                  ...u,
                  documentos: response.data
                };
              }
              return u;
            });
          });
        }
      } catch (error) {
        console.log("No se encontraron documentos adicionales para el usuario:", error.message);
        // No mostrar error al usuario, simplemente continuar sin documentos
      }
    }
  };

  const handleStatusChange = async (solicitud, newStatus) => {
    try {
      if (newStatus === 'aprobado') {
        setSelectedSolicitud(solicitud);
        setShowAsignarModal(true);
        return;
      } else if (newStatus === 'rechazado') {
        await authService.api.post('/api/notifications', {
          usuarioId: solicitud.usuarioId._id,
          mensaje: `Tu solicitud de proyector para la fecha ${formatDate(solicitud.fechaInicio)} ha sido rechazada`,
          tipo: 'error'
        });
      }
      
      const endpoint = newStatus === 'solicitud' ? `/solicituds/${solicitud._id}` : `/documentos/${solicitud._id}`;
      const response = await authService.api.put(endpoint, { 
        estado: newStatus 
      });
      
      if (response.data) {
        setUsers(prevUsers => 
          prevUsers.map(user => ({
            ...user,
            [newStatus === 'solicitud' ? 'solicitudes' : 'documentos']: 
              user[newStatus === 'solicitud' ? 'solicitudes' : 'documentos'].map(item => 
                item._id === solicitud._id 
                  ? { ...item, estado: newStatus }
                  : item
              )
          }))
        );

        alertaExito(`${newStatus === 'solicitud' ? 'Solicitud' : 'Documento'} ${newStatus} exitosamente`);

        setTimeout(() => {
          setAlert({ show: false, message: '', type: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alertaError('Error al actualizar estado');
    }
  };

  const handleViewPdf = (document) => {
    console.log("Documento completo a visualizar:", document);
    
    // Priorizar fileUrl, luego filePath
    let url = document.fileUrl || document.filePath || '';
    
    console.log("URL original del documento:", url);
    
    if (!url) {
      alert('No se encontró una URL válida para este documento');
      return;
    }
    
    // Verificar si la URL es válida
    try {
      new URL(url); // Esto lanzará un error si la URL no es válida
    } catch (error) {
      console.error("URL no válida:", url, error);
      alert('La URL del documento no es válida');
      return;
    }
    
    console.log("Abriendo PDF en nueva pestaña:", url);
    
    // Abrir en una nueva pestaña
    const newWindow = window.open(url, '_blank');
    
    // Verificar si la ventana se abrió correctamente
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.error("No se pudo abrir una nueva pestaña. Posible bloqueo de popups.");
      alert('No se pudo abrir el documento. Por favor, permite las ventanas emergentes para este sitio.');
      
      // Alternativa: crear un enlace temporal y hacer clic en él
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = document.fileName || 'documento.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const updateDocumentList = (newDocument) => {
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.userData._id === newDocument.usuarioId) {
          return {
            ...user,
            documentos: [...user.documentos, newDocument]
          };
        }
        return user;
      })
    );
  };

  useEffect(() => {
    const handleNewDocument = (event) => {
      const newDocument = event.detail;
      updateDocumentList(newDocument);
    };

    window.addEventListener('newDocument', handleNewDocument);

    return () => {
      window.removeEventListener('newDocument', handleNewDocument);
    };
  }, []);

  const handleDeleteDocument = async (documentId, usuarioId) => {
    try {
      await authService.api.delete(`/documentos/${documentId}`);
      
      // Actualizar el estado local eliminando el documento
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.userData._id === usuarioId) {
            return {
              ...user,
              documentos: user.documentos.filter(doc => doc._id !== documentId)
            };
          }
          return user;
        })
      );

      setAlert({
        show: true,
        message: 'Documento eliminado exitosamente',
        type: 'success'
      });

      setTimeout(() => {
        setAlert({ show: false, message: '', type: '' });
      }, 3000);

    } catch (error) {
      console.error('Error al eliminar documento:', error);
      setAlert({
        show: true,
        message: 'Error al eliminar el documento',
        type: 'error'
      });
    }
  };

  const handleViewError = () => {
    setIsLoading(false);
    alert('No se pudo cargar el PDF. Intenta descargarlo directamente.');
  };

  // Función para recargar los documentos
  const refreshDocuments = useCallback(async () => {
    try {
      if (selectedUser) {
        const response = await fetch(`/api/users/${selectedUser._id}/documents`, {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });
        const data = await response.json();
        
        // Actualizar solo los documentos del usuario seleccionado
        setSelectedUser(prev => ({
          ...prev,
          documentos: data.documentos
        }));

        // Actualizar la lista completa de usuarios si es necesario
        setUsers(prev => prev.map(user => 
          user._id === selectedUser._id 
            ? { ...user, documentos: data.documentos }
            : user
        ));
      }
    } catch (error) {
      console.error('Error al actualizar documentos:', error);
    }
  }, [selectedUser]);

  // Función para manejar la subida exitosa
  const handleUploadSuccess = useCallback(async (newDocument) => {
    setAlert({
      show: true,
      message: 'Documento subido exitosamente',
      type: 'success'
    });

    // Actualizar la interfaz inmediatamente
    if (selectedUser) {
      setSelectedUser(prev => ({
        ...prev,
        documentos: [...prev.documentos, newDocument]
      }));
    }

    // Recargar los documentos del servidor
    await refreshDocuments();
  }, [selectedUser, refreshDocuments]);

  // Función para recargar los datos
  const refreshData = async () => {
    try {
      setRefreshStatus(null);
      
      // Verificar si el usuario es administrador
      let currentUser;
      try {
        const userString = sessionStorage.getItem('currentUser');
        if (!userString) {
          throw new Error('No hay información de usuario en la sesión');
        }
        currentUser = JSON.parse(userString);
      } catch (parseError) {
        console.error('Error al analizar datos de usuario:', parseError);
        setError('Error en los datos de sesión. Por favor, inicia sesión nuevamente.');
        setRefreshStatus('error');
        return;
      }
      
      if (!currentUser || !currentUser.isAdmin) {
        console.error('El usuario no tiene permisos de administrador');
        setError('No tienes permisos para ver esta información');
        setRefreshStatus('error');
        return;
      }
      
      console.log("Iniciando recarga de datos como administrador:", currentUser.email);
      
      // Obtener el token JWT
      const token = sessionStorage.getItem('jwtToken');
      if (!token) {
        console.error('No hay token JWT disponible');
        setError('Sesión no válida. Por favor, inicia sesión nuevamente.');
        setRefreshStatus('error');
        return;
      }
      
      await fetchData();
      setRefreshStatus('success');
      
      setTimeout(() => {
        setRefreshStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error al recargar datos:', error);
      
      // Mostrar información detallada del error
      if (error.response) {
        console.error('Respuesta del servidor:', error.response.data);
        setError(`Error ${error.response.status}: ${error.response.data.message || 'Error del servidor'}`);
      } else if (error.request) {
        console.error('No se recibió respuesta del servidor');
        setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        setError(`Error: ${error.message}`);
      }
      
      setRefreshStatus('error');
    }
  };

  // Componente para mostrar errores
  const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-md">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <p>{message}</p>
      </div>
      <p className="mt-2 text-sm">
        Si el problema persiste, contacta al administrador del sistema.
      </p>
    </div>
  );

  // Modificar la función para renderizar la tabla de documentos
  const renderDocumentosTab = () => {
    if (!selectedUser || !selectedUser.documentos || selectedUser.documentos.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No hay documentos disponibles para este usuario
        </div>
      );
    }

    return (
      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="hidden md:table-cell p-3 text-left font-medium text-gray-600 dark:text-gray-300">
                ID
              </th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">
                Nombre del Archivo
              </th>
              <th className="hidden sm:table-cell p-3 text-left font-medium text-gray-600 dark:text-gray-300">
                Fecha de Subida
              </th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">
                Estado
              </th>
              <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-300">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {selectedUser.documentos.map((doc) => (
              <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ease-in-out">
                <td className="hidden md:table-cell p-3 text-sm dark:text-gray-200">
                  {doc._id.slice(-4)}
                </td>
                <td className="p-3 text-sm dark:text-gray-200">
                  <div>{doc.fileName}</div>
                  <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(doc.createdAt)}
                  </div>
                </td>
                <td className="hidden sm:table-cell p-3 text-sm dark:text-gray-200">
                  {formatDate(doc.createdAt)}
                </td>
                <td className="p-3 text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${doc.estado === 'aprobado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                      doc.estado === 'rechazado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    {doc.estado}
                  </span>
                </td>
                <td className="p-3 text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewPdf(doc)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Ver documento"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    {/* Agregar un botón de descarga directa como alternativa */}
                    <a
                      href={doc.fileUrl || doc.filePath}
                      download={doc.fileName || "documento.pdf"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      title="Descargar documento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Función para manejar el escaneo de QR
  const handleQrScan = async (solicitudId, usuarioId) => {
    try {
      // Buscar el usuario y la solicitud
      const userWithSolicitud = usuariosSolicitudes.find(user => 
        user.userData._id === usuarioId && 
        user.solicitudes.some(sol => sol._id === solicitudId)
      );
      
      if (userWithSolicitud) {
        // Encontrar la solicitud específica
        const solicitud = userWithSolicitud.solicitudes.find(sol => sol._id === solicitudId);
        
        if (solicitud) {
          // Seleccionar el usuario y abrir el modal de asignación
          setSelectedUser(userWithSolicitud);
          setSelectedSolicitud(solicitud);
          setShowAsignarModal(true);
          
          // Notificar al administrador
          alertaExito('Solicitud encontrada por código QR. Puede asignar un proyector ahora.');
        } else {
          alertaError('No se encontró la solicitud especificada en el código QR.');
        }
      } else {
        alertaError('No se encontró el usuario o la solicitud especificada en el código QR.');
      }
    } catch (error) {
      console.error('Error al procesar el código QR:', error);
      alertaError('Error al procesar el código QR.');
    }
  };

  const renderSolicitudesTable = () => {
    // Filtrar solicitudes para mostrar solo las de la semana actual
    const currentWeekSolicitudes = selectedUser.solicitudes.filter(solicitud => {
      const solicitudDate = new Date(solicitud.fechaInicio);
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 4); // Lunes a Viernes (5 días)
      
      return solicitudDate >= weekStart && solicitudDate <= weekEnd;
    });

    if (currentWeekSolicitudes.length === 0) {
      return (
        <div className="text-center py-6 sm:py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-3 sm:mb-4">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            No hay solicitudes para esta semana
          </p>
        </div>
      );
    }

    // Para pantallas pequeñas, mostrar tarjetas en lugar de tabla
    return (
      <div className="overflow-x-auto">
        {/* Vista de tarjetas para móviles */}
        <div className="block sm:hidden space-y-3">
          {currentWeekSolicitudes.map((solicitud) => (
            <div key={solicitud._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">ID: {solicitud._id.substring(0, 4)}</span>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {solicitud.motivo || "Solicitud de proyector"}
                  </h4>
                </div>
                <StatusBadge status={solicitud.estado} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Inicio:</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(solicitud.fechaInicio).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short'
                    })}
                    {' '}
                    {new Date(solicitud.fechaInicio).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Fin:</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(solicitud.fechaFin).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short'
                    })}
                    {' '}
                    {new Date(solicitud.fechaFin).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                {solicitud.estado === 'pendiente' && (
                  <>
                    <button
                      onClick={() => handleApprove(solicitud)}
                      className="p-1.5 rounded-full text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                      title="Aprobar"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReject(solicitud)}
                      className="p-1.5 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                      title="Rechazar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleViewDetails(solicitud)}
                  className={`p-1.5 rounded-full ${themeStyles.text} hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors`}
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Vista de tabla para pantallas más grandes */}
        <table className="hidden sm:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Motivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fecha Inicio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Fecha Fin
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentWeekSolicitudes.map((solicitud) => (
              <tr key={solicitud._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {solicitud._id.substring(0, 4)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {solicitud.motivo || "Solicitud de proyector"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>
                    {new Date(solicitud.fechaInicio).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(solicitud.fechaInicio).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>
                    {new Date(solicitud.fechaFin).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(solicitud.fechaFin).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={solicitud.estado} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {solicitud.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleApprove(solicitud)}
                          className="p-1.5 rounded-full text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                          title="Aprobar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(solicitud)}
                          className="p-1.5 rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          title="Rechazar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleViewDetails(solicitud)}
                      className={`p-1.5 rounded-full ${themeStyles.text} hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors`}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleViewDetails = (solicitud) => {
    setSelectedSolicitud(solicitud);
    setShowModal(true); // Asumiendo que tienes un modal para ver detalles
  };

  const handleApprove = async (solicitud) => {
    // En lugar de hacer el handleStatusChange aquí,
    // solo abrimos el modal de asignación
    setSelectedSolicitud(solicitud);
    setShowAsignarModal(true);
  };

  const handleAsignacionExitosa = async (proyector) => {
    // La alerta y actualización se manejan después de asignar el proyector
    alertaExito('Solicitud aprobada exitosamente');
    await fetchData(); // Recargar los datos
  };

  const handleReject = async (solicitud) => {
    try {
      await handleStatusChange(solicitud, 'rechazado');
      alertaExito('Solicitud rechazada exitosamente');
      
      // Enviar notificación al usuario
      await authService.api.post('/api/notifications', {
        usuarioId: solicitud.usuarioId._id,
        mensaje: `Tu solicitud de proyector para la fecha ${formatDate(solicitud.fechaInicio)} ha sido rechazada`,
        tipo: 'error'
      });
      
      // Recargar datos
      await fetchData();
    } catch (error) {
      console.error('Error al rechazar:', error);
      alertaError('Error al rechazar la solicitud');
    }
  };

  // Función para manejar acciones del usuario desde el modal
  const handleUserAction = (user) => {
    // Cerrar el modal actual
    setShowModal(false);
    
    // Aquí puedes implementar la navegación al perfil completo del usuario
    // Por ejemplo, usando navigate de react-router-dom
    // navigate(`/user-profile/${user.userData._id}`);
    
    // O simplemente mostrar una alerta por ahora
    alertaExito(`Ver perfil completo de ${user.userData.nombre}`);
    
    // También podrías abrir otro modal con más detalles
    // setShowProfileModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      {/* Alerta flotante mejorada */}
      {alert.show && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down w-full max-w-md mx-auto">
          <div className={`
            shadow-2xl rounded-lg pointer-events-auto
            border-l-4 mx-4
            ${alert.type === 'success' ? 'bg-green-50 border-green-500' : 
              alert.type === 'error' ? 'bg-red-50 border-red-500' : 
              'bg-yellow-50 border-yellow-500'}
          `}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {alert.type === 'success' && (
                    <Check className={`h-8 w-8 text-green-500`} />
                  )}
                  {alert.type === 'error' && (
                    <X className={`h-8 w-8 text-red-500`} />
                  )}
                  {alert.type === 'warning' && (
                    <AlertCircle className={`h-8 w-8 text-yellow-500`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className={`
                    text-lg font-semibold
                    ${alert.type === 'success' ? 'text-green-800' : 
                      alert.type === 'error' ? 'text-red-800' : 
                      'text-yellow-800'}
                  `}>
                    {alert.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => setAlert({ show: false, message: '', type: '' })}
                    className={`
                      rounded-full p-1.5
                      transition-colors duration-200
                      ${alert.type === 'success' ? 'hover:bg-green-100 text-green-500' : 
                        alert.type === 'error' ? 'hover:bg-red-100 text-red-500' : 
                        'hover:bg-yellow-100 text-yellow-500'}
                    `}
                  >
                    <span className="sr-only">Cerrar</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Barra de búsqueda */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className={`text-2xl font-bold ${themeStyles.text} mb-6`}>
              Solicitudes por Usuario
            </h2>
            <button
              onClick={refreshData}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg 
                        bg-gradient-to-r ${themeStyles.gradient} text-white
                        hover:shadow-md transition-all duration-300 transform hover:scale-105`}
              disabled={isLoading}
            >
              <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Mostrar mensaje de error si existe */}
        {error && <ErrorMessage message={error} />}

        {/* Agregar indicador de semana actual */}
        <div className={`p-4 rounded-lg shadow-md mb-6 bg-gradient-to-r ${themeStyles.gradient} text-white`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">
              Semana Actual
            </h3>
          </div>
          <p className="text-white/90">
            Del {startOfWeek(new Date()).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })} al {new Date(startOfWeek(new Date()).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>

        {/* Lista de usuarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.userData._id}
              onClick={() => handleUserClick(user)}
              className={`p-5 rounded-lg shadow-md cursor-pointer transform transition-all duration-300
                        hover:shadow-lg hover:scale-105 relative overflow-hidden
                        ${selectedUser && selectedUser.userData._id === user.userData._id
                          ? `ring-2 ring-offset-2 ${themeStyles.border}`
                          : 'bg-white dark:bg-gray-800'}`}
            >
              {/* Fondo con gradiente del tema actual */}
              <div className={`absolute inset-0 bg-gradient-to-br ${themeStyles.gradient} opacity-${
                selectedUser && selectedUser.userData._id === user.userData._id ? '100' : '0'
              } transition-opacity duration-300 ${
                selectedUser && selectedUser.userData._id === user.userData._id ? '' : 'hover:opacity-10'
              }`}></div>
              
              {/* Contenido de la card */}
              <div className="relative z-10">
                <div className="flex items-center mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center 
                                bg-gradient-to-r ${themeStyles.gradient} text-white font-bold text-xl
                                shadow-md`}>
                    {user.userData.nombre.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h3 className={`text-lg font-semibold ${
                      selectedUser && selectedUser.userData._id === user.userData._id
                        ? 'text-white'
                        : themeStyles.text
                    }`}>
                      {user.userData.nombre}
                    </h3>
                    <p className={`text-sm ${
                      selectedUser && selectedUser.userData._id === user.userData._id
                        ? 'text-white/80'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {user.userData.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedUser && selectedUser.userData._id === user.userData._id
                      ? 'bg-white/20 text-white'
                      : `${themeStyles.background} ${themeStyles.text}`
                  }`}>
                    Grado: {user.userData.grado || 'N/A'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedUser && selectedUser.userData._id === user.userData._id
                      ? 'bg-white/20 text-white'
                      : `${themeStyles.background} ${themeStyles.text}`
                  }`}>
                    Grupo: {user.userData.grupo || 'N/A'}
                  </span>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <p className={`text-sm font-medium ${
                      selectedUser && selectedUser.userData._id === user.userData._id
                        ? 'text-white'
                        : themeStyles.text
                    }`}>
                      Solicitudes: {user.solicitudes.length}
                    </p>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center 
                                  ${selectedUser && selectedUser.userData._id === user.userData._id
                                    ? 'bg-white/20 text-white'
                                    : `${themeStyles.background} ${themeStyles.text}`
                                  }`}>
                      {user.solicitudes.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Solicitudes con mejoras para móviles */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-3xl mx-auto"
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header del Modal con gradiente del tema */}
              <div className={`bg-gradient-to-r ${themeStyles.gradient} p-4 sm:p-5 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                      Solicitudes de {selectedUser.userData.nombre}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 truncate">
                      Mostrando solicitudes de la semana actual
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-4 sm:p-6 dark:text-gray-100 overflow-y-auto flex-1">
                {/* Pestañas para alternar entre solicitudes y documentos */}
                <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
                  <ul className="flex flex-wrap -mb-px">
                    <li className="mr-2">
                      <button
                        onClick={() => setActiveTab('solicitudes')}
                        className={`inline-block p-2 sm:p-4 font-medium transition-all duration-200 text-sm sm:text-base ${
                          activeTab === 'solicitudes'
                            ? `${themeStyles.text} border-b-2 ${themeStyles.border}`
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Solicitudes
                      </button>
                    </li>
                    <li className="mr-2">
                      <button
                        onClick={() => setActiveTab('documentos')}
                        className={`inline-block p-2 sm:p-4 font-medium transition-all duration-200 text-sm sm:text-base ${
                          activeTab === 'documentos'
                            ? `${themeStyles.text} border-b-2 ${themeStyles.border}`
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        Documentos
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="max-h-[50vh] sm:max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {activeTab === 'solicitudes' ? (
                    renderSolicitudesTable()
                  ) : (
                    renderDocumentosTab()
                  )}
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="flex items-center justify-end gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 
                           bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                           rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de previsualización de PDF */}
      {pdfPreviewModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-11/12 h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className={`text-lg font-medium ${themeStyles.text} dark:text-gray-100`}>
                Previsualización del documento
              </h3>
              <button
                onClick={() => setPdfPreviewModal({ show: false, url: '' })}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="w-full h-[calc(100%-4rem)] relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              )}
              <embed
                src={pdfPreviewModal.url}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsLoading(false)}
                onError={handleViewError}
              />
              
              {/* Fallback si embed no funciona */}
              <object
                data={pdfPreviewModal.url}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                  <p className="text-gray-600 mb-4">No se puede mostrar el PDF en el navegador</p>
                  <a 
                    href={pdfPreviewModal.url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Descargar PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {refreshStatus && (
        <div 
          className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg
            transition-all duration-300 transform translate-y-0
            ${refreshStatus === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'}`}
        >
          <div className="flex items-center gap-2">
            {refreshStatus === 'success' 
              ? '✓ Solicitudes actualizadas correctamente'
              : '✕ Error al actualizar las solicitudes'}
          </div>
        </div>
      )}

      <AsignarProyectorModal
        show={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        solicitud={selectedSolicitud}
        onAsignar={handleAsignacionExitosa}
        className="z-50"
      />
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusStyles = {
    pendiente: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    aprobado: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    rechazado: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
  };
  
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
};

export default UserRequests;