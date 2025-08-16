// Servicio para controlar alertas y evitar duplicados

// Variable para almacenar los IDs de alertas mostradas recientemente
let recentAlerts = new Set();

// Tiempo en milisegundos para considerar una alerta como "reciente"
const ALERT_COOLDOWN = 3000;

/**
 * Verifica si una alerta con el mismo ID ya se mostró recientemente
 * @param {string} alertId - Identificador único de la alerta
 * @returns {boolean} - true si se puede mostrar, false si está en cooldown
 */
const canShowAlert = (alertId) => {
  if (recentAlerts.has(alertId)) {
    return false;
  }
  
  // Registrar esta alerta como mostrada
  recentAlerts.add(alertId);
  
  // Programar la eliminación del ID después del tiempo de cooldown
  setTimeout(() => {
    recentAlerts.delete(alertId);
  }, ALERT_COOLDOWN);
  
  return true;
};

/**
 * Limpia todas las alertas recientes (útil al cambiar de página)
 */
const clearRecentAlerts = () => {
  recentAlerts.clear();
};

export const alertService = {
  canShowAlert,
  clearRecentAlerts
}; 