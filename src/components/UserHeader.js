import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import QRScanner from './QRScanner';

const UserHeader = ({ user, userPicture, onLogout }) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleScanSuccess = (qrData) => {
    console.log('Datos del QR escaneado:', qrData);
    setShowScanner(false);

    // Lógica de redirección basada en el tipo de QR
    if (qrData.type === 'devolucion') {
      // Redirigir a la nueva página de devolución
      window.location.href = `/devolver-proyector?solicitudId=${qrData.solicitudId}&proyectorId=${qrData.proyectorId}`;
    } else if (qrData.type === 'asignacion') {
      // Redirigir a la página de asignación existente
      window.location.href = `/asignar-proyector-directo?solicitudId=${qrData.solicitudId}`;
    } else {
      // Fallback por si el tipo no es reconocido
      alertaError('Tipo de QR no reconocido.');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 
                    bg-gray-200 dark:bg-gray-800 p-3 rounded-lg shadow-sm
                    w-full transition-all duration-300">
      {user && (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
              {userPicture && (
                <img 
                  src={userPicture}
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium truncate">
              {user.nombre}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón de escaneo QR (solo para administradores) */}
            {user.rol === 'admin' && (
              <button
                onClick={() => setShowScanner(true)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Escanear QR"
              >
                <Camera size={20} />
              </button>
            )}
            
            {/* Botón de cerrar sesión */}
            <button 
              onClick={onLogout} 
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white text-sm sm:text-base rounded-lg hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </>
      )}
      
      {/* Modal de escáner QR */}
      {showScanner && (
        <QRScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
};

export default UserHeader;