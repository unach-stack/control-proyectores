import { useEffect } from 'react';

const useShowGradeGroupModal = (isAuthenticated, isAdmin, setShowGradeGroupModal) => {
  useEffect(() => {
    const first = sessionStorage.getItem('new');
    if (isAuthenticated && !isAdmin && first === 'true') {
      setTimeout(() => {
        setShowGradeGroupModal(true);
        console.log('Estoy en useShowGradeGroupModal', first);
        // sessionStorage.removeItem('new'); // Puedes descomentar si deseas limpiar el valor
      }, 2000);
      
    }
  }, [isAuthenticated, isAdmin, setShowGradeGroupModal]);
};

export default useShowGradeGroupModal;
