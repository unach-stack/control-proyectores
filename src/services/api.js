import { BACKEND_URL } from '../config/config';

// Reemplaza la definición de API_URL
const API_URL = BACKEND_URL;

// Función para login
export const loginUser = async (token) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  return response.json();
};

// Función para obtener proyectores
export const getProyectores = async () => {
  const response = await fetch(`${API_URL}/proyectores`);
  return response.json();
};

// Función para crear solicitud
export const createSolicitud = async (solicitudData) => {
  const response = await fetch(`${API_URL}/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(solicitudData)
  });
  return response.json();
};
