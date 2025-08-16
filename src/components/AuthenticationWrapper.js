import React from 'react';
import { useAuth } from '../hooks/useAuth';
import GradeGroupModal from './GradeGroupModal';
import { Navigate } from 'react-router-dom';

const AuthenticationWrapper = ({ children }) => {
  const { isAuthenticated, isAdmin, needsProfileCompletion } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (isAdmin) {
    return children;
  }

  if (needsProfileCompletion) {
    return (
      <GradeGroupModal 
        isOpen={true}
        onClose={() => {}} // Modal no se puede cerrar
        forceCompletion={true} // Nueva prop para forzar el completado
      />
    );
  }

  return children;
};

export default AuthenticationWrapper; 