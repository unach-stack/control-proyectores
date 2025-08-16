import { BACKEND_URL } from '../config/config';

/**
 * Helper para realizar peticiones fetch al backend
 * @param {string} endpoint - Ruta relativa del endpoint (sin la URL base)
 * @param {Object} options - Opciones de fetch (method, headers, body, etc)
 * @returns {Promise} - Promesa con la respuesta
 */
export const fetchFromAPI = async (endpoint, options = {}) => {
  try {
    // Configuración de la URL base
    const baseURL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000'
      : BACKEND_URL;
    
    const url = `${baseURL}${endpoint}`;
    console.log('Realizando petición a:', url);

    // Obtener el token de sessionStorage
    const token = sessionStorage.getItem('jwtToken');
    if (!token && !endpoint.includes('/auth')) {
      console.warn('No hay token disponible para petición autenticada');
    }

    // Configurar headers por defecto
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Manejar errores de respuesta
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        console.error('Error de autenticación - Token inválido o expirado');
      }
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    // Verificar si la respuesta está vacía
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (!text.trim()) return {};
      try {
        return JSON.parse(text);
      } catch (e) {
        return { text };
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en fetchFromAPI:', error);
    throw error;
  }
}; 