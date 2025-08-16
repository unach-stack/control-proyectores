import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { alertaError, alertaExito } from './Alert';
import { alertService } from '../services/alertService';

const QRScanner = ({ onScanSuccess, onClose }) => {
  const [startScan, setStartScan] = useState(true);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Limpiar alertas al montar el componente
    alertService.clearRecentAlerts();
    
    // Verificar permisos de cámara al montar
    checkCameraPermission();
    
    // Limpiar al desmontar
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (err) {
          // Silenciar errores al detener
        }
      }
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      setCameraError(null);
      
      // Iniciar el escáner después de verificar permisos
      setTimeout(() => {
        initializeScanner();
      }, 1000);
    } catch (error) {
      console.error("Error al verificar permisos de cámara:", error);
      setCameraPermission('denied');
      setCameraError(error.message || 'No se pudo acceder a la cámara');
      alertaError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const requestCameraPermission = () => {
    setCameraPermission(null);
    setCameraError(null);
    checkCameraPermission();
  };
  
  const initializeScanner = async () => {
    try {
      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) {
        console.error("Elemento qr-reader no encontrado");
        alertaError('Error al inicializar el escáner');
        return;
      }
      
      qrReaderElement.style.width = "100%";
      qrReaderElement.style.height = "300px";
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          // Ignorar errores al detener
        }
      }
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      const availableCameras = await Html5Qrcode.getCameras();
      console.log("Cámaras disponibles:", availableCameras);
      setCameras(availableCameras);

      // Intentar encontrar la cámara trasera
      let cameraId = availableCameras[0]?.id; // Por defecto, primera cámara
      const backCamera = availableCameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('trasera') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        cameraId = backCamera.id;
        console.log("Usando cámara trasera:", backCamera.label);
      }
      
      setSelectedCamera(cameraId);

      if (cameraId) {
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 }, // Asegurando que el qrbox también sea cuadrado
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          aspectRatio: 1.0, // Forzar aspecto de 1.0 (cuadrado)
          showTorchButtonIfSupported: true
        };
        
        await html5QrCode.start(
          { facingMode: "environment" }, // Forzar cámara trasera
          config,
          handleScan,
          (errorMessage) => {
            if (!errorMessage.includes("No QR code found") && 
                !errorMessage.includes("No MultiFormat Readers")) {
              console.error("Error de escaneo:", errorMessage);
            }
          }
        );
      }
    } catch (err) {
      console.error("Error al inicializar el escáner:", err);
      setCameraError(err.message);
      alertaError('Error al inicializar el escáner de QR.');
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    
    if (scannerRef.current) {
      await scannerRef.current.stop();
      await initializeScanner(cameras[nextIndex].id);
    }
  };

  const handleScan = (decodedText) => {
    if (!decodedText) return;
    
    console.log("Texto decodificado del QR:", decodedText);
    
    try {
      // Intentar parsear el texto como JSON
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch (e) {
        // Si no es JSON válido, usar el texto tal cual
        qrData = { solicitudId: decodedText };
      }
      
      // Verificar que tenga la estructura esperada o al menos un ID
      if (qrData && (qrData.solicitudId || qrData.id)) {
        const solicitudId = qrData.solicitudId || qrData.id;
        console.log("QR escaneado correctamente:", qrData);
        
        // Detener el escáner
        if (scannerRef.current) {
          try {
            scannerRef.current.stop();
          } catch (err) {
            // Silenciar errores al detener
          }
        }
        
        // Notificar éxito solo una vez
        alertaExito('Código QR escaneado correctamente');
        
        // Llamar al callback con los datos
        setTimeout(() => {
          onScanSuccess(qrData);
        }, 1000);
      } else {
        alertaError('El código QR no contiene datos válidos de solicitud');
      }
    } catch (error) {
      console.error("Error al procesar el código QR:", error);
      alertaError('Error al procesar el código QR. Formato inválido.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Escanear código QR
          </h2>
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
            >
              Cambiar cámara
            </button>
          )}
        </div>
        
        {cameraPermission === 'granted' ? (
          <>
            {startScan ? (
              <div className="relative" ref={containerRef}>
                <div id="qr-reader" className="w-full h-64 rounded-lg overflow-hidden bg-gray-200"></div>
                {/* Recuadro de escaneo modificado para forzar forma cuadrada */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-blue-500 rounded-lg" style={{ maxWidth: '90%', maxHeight: '90%', aspectRatio: '1/1' }}></div>
                </div>
                <p className="text-sm text-center mt-2 text-gray-600 dark:text-gray-400">
                  Coloca el código QR dentro del recuadro
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  ¡Código escaneado correctamente!
                </p>
              </div>
            )}
          </>
        ) : cameraPermission === 'denied' ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">
              No se pudo acceder a la cámara. Por favor, verifica los permisos del navegador.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Puedes reiniciar los permisos en la configuración de tu navegador o intentar nuevamente.
            </p>
            <button
              onClick={requestCameraPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              Verificando acceso a la cámara...
            </p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          </div>
        )}
        
        {cameraError && (
          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">
              Error: {cameraError}
            </p>
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;