import React, { useCallback, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { TimeZoneProvider } from './contexts/TimeZoneContext';
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/AdminSidebar';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import RequestProjector from './components/RequestProjector';
import UploadDocuments from './components/UploadDocuments';
import ViewDocuments from './components/ViewDocuments';
import SignIn from './components/SignIn';
import GradeGroupModal from './components/GradeGroupModal';
import { authService } from './services/authService';
import useInactivityTimer from './hooks/useInactivityTimer';
import { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BACKEND_URL } from './config/config';
import { Camera } from 'lucide-react';
import QRScanner from './components/QRScanner';
import UserRequests from './components/UserRequests';
import MySolicitudes from './components/MySolicitudes';
import AdminProyectores from './components/AdminProyectores';
import NotificationsDropdown from './components/NotificationsDropdown';
import AsignarProyectorDirecto from './components/AsignarProyectorDirecto';
import { alertaError } from './components/Alert';
import { alertService } from './services/alertService';
import QRHistory from './components/QRHistory';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeSelector from './components/ThemeSelector';
import ReportGenerator from './components/ReportGenerator';
import DevolverProyectorDirecto from './components/DevolverProyectorDirecto';
import UserProfile from './components/UserProfile';
import FaultyProjectors from './components/FaultyProjectors';
import UserCommentsModal from './components/UserCommentsModal';
import AdminEncargados from './components/AdminEncargados';

const App = () => {
  const { 
    isAuthenticated, 
    isAdmin, 
    isLoading, 
    user, 
    userPicture,
    handleLogout,
    updateUserData
  } = useAuth();

  useInactivityTimer(handleLogout, 10 * 60 * 1000); // 10 minutos

  const [showGradeGroupModal, setShowGradeGroupModal] = React.useState(false);
  const [tokenTimeLeft, setTokenTimeLeft] = React.useState(15 * 60); // 15 minutos en segundos
  const [showScanner, setShowScanner] = useState(false);
  const [showUserCommentsModal, setShowUserCommentsModal] = useState(false);
  const [selectedSolicitudForComment, setSelectedSolicitudForComment] = useState(null);

  const handleProfileUpdate = useCallback(async (data) => {
    try {
      const response = await authService.updateUserProfile(data);
      setShowGradeGroupModal(false);
      return response;
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      throw error;
    }
  }, []);

  const handleNotificationClick = async (solicitudId) => {
    try {
      const response = await authService.api.get(`/solicitudes/id/${solicitudId}`);
      setSelectedSolicitudForComment(response.data);
      setShowUserCommentsModal(true);
    } catch (error) {
      console.error('Error fetching solicitud for comments modal:', error);
      alertaError('No se pudo cargar la solicitud para dejar comentarios.');
    }
  };

  const handleCloseCommentsModal = () => {
    setShowUserCommentsModal(false);
    setSelectedSolicitudForComment(null);
  };

  const handleCommentsUpdated = () => {
    // Refresh data here if needed, e.g., MySolicitudes
  };

  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (isAdmin) {
        setShowGradeGroupModal(false);
        return;
      }

      const isGradoMissing = user.grado === null || user.grado === undefined || user.grado === "";
      const isGrupoMissing = user.grupo === null || user.grupo === undefined || user.grupo === "";

      if (isGradoMissing || isGrupoMissing) {
        const fetchUserData = async () => {
          try {
            const token = sessionStorage.getItem('jwtToken');
            if (!token) return;

            const response = await fetch(`${BACKEND_URL}/user-data`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const userData = await response.json();
              if (userData.user && userData.user.grado && userData.user.grupo) {
                updateUserData(userData.user);
                setShowGradeGroupModal(false);
              } else {
                if (userData.user && userData.user.isAdmin) {
                  setShowGradeGroupModal(false);
                } else {
                  setShowGradeGroupModal(true);
                }
              }
            }
          } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
          }
        };

        fetchUserData();
      } else {
        setShowGradeGroupModal(false);
      }
    }
  }, [isAuthenticated, user, isAdmin, updateUserData]);

  React.useEffect(() => {
    let timer;
    if (isAuthenticated) {
      setTokenTimeLeft(15 * 60); // 15 minutos en segundos
      timer = setInterval(() => {
        setTokenTimeLeft(prev => {
          // Mostrar advertencia cuando queden 2 minutos
          if (prev === 120) {
            Swal.fire({
              title: '¡Advertencia!',
              text: 'Tu sesión expirará en 2 minutos',
              icon: 'warning',
              timer: 5000,
              timerProgressBar: true,
              showConfirmButton: false
            });
          }

          if (prev <= 1) {
            clearInterval(timer);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Función para formatear el tiempo restante
  const formatTimeLeft = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Agregar esta función para actualizar el contexto sin recargar
  React.useEffect(() => {
    // Función global para actualizar el contexto de autenticación
    window.updateAuthContext = (updatedUser) => {
      // Usar la función del contexto de autenticación para actualizar los datos
      if (updateUserData) {
        updateUserData(updatedUser);
      }
      
      // Si el usuario ya tiene los datos completos, no mostrar el modal
      if (updatedUser && updatedUser.grado && updatedUser.grupo) {
        setShowGradeGroupModal(false);
      }
    };

    return () => {
      // Limpiar la función global al desmontar el componente
      delete window.updateAuthContext;
    };
  }, [updateUserData]);

  // Función para manejar el escaneo exitoso
  const handleScanSuccess = (qrData) => {
    // Limpiar alertas antes de procesar
    alertService.clearRecentAlerts();
    
    // Verificar si qrData es un string (JSON) o ya es un objeto
    let solicitudData;
    try {
      if (typeof qrData === 'string') {
        solicitudData = JSON.parse(qrData);
      } else {
        solicitudData = qrData;
      }
      
      // Cerrar el escáner antes de redirigir
      setShowScanner(false);
      
      // Redirigir a la página de asignación directa con el ID de la solicitud
      window.location.href = `/asignar-directo?solicitudId=${solicitudData.solicitudId}`;
    } catch (error) {
      console.error('Error al parsear datos del QR:', error);
      alertaError('Formato de QR inválido');
      setShowScanner(false);
    }
  };

  // Mostrar loader mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen min-w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-full">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <TimeZoneProvider>
        <div className="min-h-screen min-w-screen bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row overflow-x-hidden">
          {isAuthenticated && (
            <>
              {isAdmin ? (
                <AdminSidebar />
              ) : (
                <Sidebar 
                  openGradeGroupModal={() => setShowGradeGroupModal(true)}
                />
              )}
            </>
          )}

          {/* Contenido principal */}
          <main className={`flex-1 transition-all duration-300 overflow-x-hidden
                           ${isAuthenticated ? 'lg:ml-72' : ''}`}>
            <div className="p-2 sm:p-4 mt-14 sm:mt-0 overflow-x-hidden">
              <div className="w-full">
                {/* Header del usuario */}
                {isAuthenticated && user && (
                  <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 bg-white dark:bg-gray-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg shadow-md">
                    {/* Timer de sesión */}
                    <div className={`
                      px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 flex-shrink-0
                      ${tokenTimeLeft <= 120
                        ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300'
                        : tokenTimeLeft <= 300
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300'
                      }
                    `}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-mono">{formatTimeLeft(tokenTimeLeft)}</span>
                    </div>

                    {/* Derecha: avatar, QR, notificaciones, logout */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-300 rounded-full overflow-hidden flex-shrink-0">
                          {userPicture && (
                            <img src={userPicture} alt="Perfil" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="hidden sm:block text-gray-700 dark:text-gray-200 text-sm font-medium truncate max-w-[130px]">
                          {user.nombre}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => setShowScanner(true)}
                          className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex-shrink-0"
                          title="Escanear QR"
                        >
                          <Camera size={16} />
                        </button>
                      )}

                      <NotificationsDropdown onNotificationClick={handleNotificationClick} />

                      <button
                        onClick={handleLogout}
                        className="px-2.5 py-1.5 sm:px-3 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                      >
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                        <span className="sm:hidden">Salir</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Rutas */}
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      isAuthenticated 
                        ? <Navigate to={isAdmin ? "/admin-dashboard" : "/dashboard"} replace /> 
                        : <Navigate to="/signin" replace />
                    } 
                  />

                  <Route 
                    path="/signin" 
                    element={
                      isLoading ? (
                        <div className="min-h-screen flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                        </div>
                      ) : isAuthenticated ? (
                        <Navigate to={isAdmin ? "/admin-dashboard" : "/dashboard"} replace />
                      ) : (
                        <SignIn />
                      )
                    } 
                  />

                  {/* Rutas protegidas */}
                  <Route 
                    path="/dashboard" 
                    element={
                      isAuthenticated && !isAdmin 
                        ? <Dashboard isAuthenticated={isAuthenticated} isAdmin={isAdmin} setShowGradeGroupModal={setShowGradeGroupModal}/> 
                        : <Navigate to={isAdmin ? "/admin-dashboard" : "/signin"} />
                    } 
                  />
                  <Route 
                    path="/admin-dashboard" 
                    element={
                      isAuthenticated && isAdmin 
                        ? <AdminDashboard /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route
                    path="/request-projector" 
                    element={
                      isAuthenticated ? <RequestProjector /> : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/upload-documents" 
                    element={
                      isAuthenticated ? <UploadDocuments /> : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/view-documents" 
                    element={
                      isAuthenticated ? <ViewDocuments /> : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/user-requests" 
                    element={
                      isAuthenticated && isAdmin 
                        ? <UserRequests /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/mis-solicitudes" 
                    element={
                      isAuthenticated 
                        ? <MySolicitudes /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/admin-proyectores" 
                    element={
                      isAuthenticated && isAdmin 
                        ? <AdminProyectores /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/faulty-projectors" 
                    element={
                      isAuthenticated && isAdmin 
                        ? <FaultyProjectors /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/asignar-directo" 
                    element={
                      isAuthenticated && isAdmin 
                        ? <AsignarProyectorDirecto /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/qr-history" 
                    element={
                      isAuthenticated 
                        ? <QRHistory /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  <Route 
                    path="/personalizacion" 
                    element={
                      isAuthenticated 
                        ? <ThemeSelector /> 
                        : <Navigate to="/signin" />
                    } 
                  />
                  
                  <Route
                    path="/reports"
                    element={
                      isAuthenticated && isAdmin
                        ? <ReportGenerator />
                        : <Navigate to="/signin" />
                    }
                  />
                  <Route
                    path="/admin-encargados"
                    element={
                      isAuthenticated && isAdmin
                        ? <AdminEncargados />
                        : <Navigate to="/signin" />
                    }
                  />

                  <Route path="/devolver-proyector" element={<DevolverProyectorDirecto />} />
                  <Route path="/user-profile" element={<UserProfile />} />
                  <Route path="*" element={<Navigate to="/signin" />} />
                </Routes>

                {/* Modales */}
                {showGradeGroupModal && (
                  <GradeGroupModal 
                    isOpen={showGradeGroupModal}
                    onClose={() => setShowGradeGroupModal(false)}
                    onSubmit={handleProfileUpdate}
                  />
                )}

                {showUserCommentsModal && selectedSolicitudForComment && (
                  <UserCommentsModal
                    show={showUserCommentsModal}
                    onClose={handleCloseCommentsModal}
                    solicitud={selectedSolicitudForComment}
                    onUpdate={() => {
                      handleCloseCommentsModal();
                      handleCommentsUpdated();
                    }}
                  />
                )}

                {/* Modal de escáner QR */}
                {showScanner && (
                  <QRScanner 
                    onScanSuccess={handleScanSuccess} 
                    onClose={() => setShowScanner(false)} 
                  />
                )}
              </div>
            </div>
          </main>
        </div>
        <Toaster
          position="top-center"
          gutter={8}
          containerStyle={{
            top: 16,
            zIndex: 9999,
          }}
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              maxWidth: '380px',
              width: '90vw',
            },
            success: {
              duration: 3500,
              style: {
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
              },
              iconTheme: {
                primary: '#16a34a',
                secondary: '#f0fdf4',
              },
            },
            error: {
              duration: 4000,
              style: {
                background: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
              },
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fef2f2',
              },
            },
          }}
        />
      </TimeZoneProvider>
    </ThemeProvider>
  );
}

export default App;
