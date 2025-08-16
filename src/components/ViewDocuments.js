import React, { useEffect, useState } from 'react';
import { FiFile, FiSearch, FiDownload, FiFilter, FiLoader } from 'react-icons/fi';
import { authService } from '../services/authService';

function ViewDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        
        // Usar el token para la autenticación
        const token = sessionStorage.getItem('jwtToken');
        const response = await fetch(`${baseUrl}/documentos`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Error al cargar documentos');
        const data = await response.json();
        console.log('Documentos cargados:', data);
        setDocuments(data);
        setError(null);
      } catch (err) {
        console.error('Error al cargar documentos:', err);
        setError('No se pudieron cargar los documentos. Por favor, intenta más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc => {
    // Usar el nombre del archivo desde filePath
    const fileName = doc.filePath ? doc.filePath.split('/').pop() : '';
    const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterDate === 'all') return matchesSearch;
    
    const docDate = new Date(doc.createdAt);
    const today = new Date();
    const diffDays = Math.floor((today - docDate) / (1000 * 60 * 60 * 24));
    
    switch (filterDate) {
      case 'week': return diffDays <= 7 && matchesSearch;
      case 'month': return diffDays <= 30 && matchesSearch;
      default: return matchesSearch;
    }
  });

  const getFileIcon = (filePath) => {
    if (!filePath) return <FiFile className="w-8 h-8 text-gray-500" />;
    
    const fileName = filePath.split('/').pop();
    const extension = fileName.split('.').pop().toLowerCase();
    const iconClasses = "w-8 h-8";
    
    switch (extension) {
      case 'pdf':
        return <FiFile className={`${iconClasses} text-red-500`} />;
      case 'doc':
      case 'docx':
        return <FiFile className={`${iconClasses} text-blue-500`} />;
      default:
        return <FiFile className={`${iconClasses} text-gray-500`} />;
    }
  };

  const handleViewDocument = (doc) => {
    if (!doc || !doc.fileUrl) {
      console.error('Documento inválido o sin URL');
      return;
    }
    
    console.log('Abriendo documento:', doc.fileUrl);
    
    // Abrir directamente la URL de Cloudinary
    window.open(doc.fileUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] 
                      text-blue-500 dark:text-blue-400">
        <FiLoader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg 
                      text-red-600 dark:text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
            Documentos Subidos
          </h2>
          
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 
                         rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600
                         placeholder-gray-500 dark:placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <FiFile className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay documentos disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
              <div
                key={doc._id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg 
                         border border-gray-200 dark:border-gray-700 
                         hover:shadow-lg dark:hover:shadow-gray-700/50 
                         transition-shadow duration-200"
              >
                <div className="flex items-start gap-4">
                  {getFileIcon(doc.filePath)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.filePath ? doc.filePath.split('/').pop() : 'Documento sin nombre'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Subido el: {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Usuario: {doc.nombre || 'Desconocido'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Estado: <span className={`font-medium ${
                        doc.estado === 'aprobado' ? 'text-green-500' : 
                        doc.estado === 'rechazado' ? 'text-red-500' : 'text-yellow-500'
                      }`}>{doc.estado || 'pendiente'}</span>
                    </p>
                  </div>
                  <button 
                    className="p-2 text-gray-500 dark:text-gray-400 
                             hover:text-blue-500 dark:hover:text-blue-400 
                             transition-colors"
                    title="Ver documento"
                    onClick={() => handleViewDocument(doc)}
                  >
                    <FiDownload className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewDocuments;