// Configuración centralizada para la aplicación

// URLs base
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
export const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

// Lista de correos administrativos
export const ADMIN_EMAILS = [
  'proyectoresunach@gmail.com',
  'fanny.cordova@unach.mx',
  'nidia.guzman@unach.mx',
  'deysi.gamboa@unach.mx',
  'diocelyne.arrevillaga@unach.mx',
  'karol.carrazco@unach.mx',
  'karen.portillo@unach.mx',
  'pedro.escobar@unach.mx',
  'brianes666@gmail.com',
  'brianfloresxxd@gmail.com'
];

// Configuración de autenticación
export const AUTH_CONFIG = {
  API_BASE_URL: BACKEND_URL,
  ADMIN_EMAILS: ADMIN_EMAILS,
  STORAGE_KEYS: {
    JWT_TOKEN: 'jwtToken',
    JWT_REFRESH_TOKEN: 'refreshToken',
    USER_DATA: 'userData',
    USER_PICTURE: 'userPicture',
    FIRSTLOG: 'firstLog'
  }
};

// Otras configuraciones globales
export const APP_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
}; 