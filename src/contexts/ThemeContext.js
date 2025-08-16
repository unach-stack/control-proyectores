import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const token = sessionStorage.getItem('jwtToken');
        let themeData;
        
        if (token) {
          const response = await authService.api.get('/user-theme');
          themeData = response.data;
        } else {
          const lastTheme = await authService.api.get('/last-theme');
          themeData = lastTheme.data;
        }

        if (themeData) {
          setCurrentTheme(themeData.theme || 'default');
          setDarkMode(themeData.darkMode);
          document.documentElement.classList.toggle('dark', themeData.darkMode);
        }
      } catch (error) {
        console.error('Error al cargar el tema:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, []); // Remover dependencias para que solo se ejecute al montar

  const changeTheme = async (newTheme) => {
    try {
      await authService.api.put('/update-theme', { 
        theme: newTheme,
        darkMode // Asegurarnos de enviar el estado actual del darkMode
      });
      
      setCurrentTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      // Mantener el darkMode
      document.documentElement.classList.toggle('dark', darkMode);
      toast.success('Tema actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar el tema:', error);
      toast.error('Error al actualizar el tema');
    }
  };

  const toggleDarkMode = async (isDark) => {
    try {
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
      
      // Actualizar en el backend con el tema actual
      await authService.api.put('/update-theme', {
        theme: currentTheme,
        darkMode: isDark
      });

      // No mostrar toast para una experiencia más fluida
    } catch (error) {
      console.error('Error al cambiar modo oscuro:', error);
      setDarkMode(!isDark); // Revertir en caso de error
      document.documentElement.classList.toggle('dark', !isDark);
      toast.error('Error al cambiar modo oscuro');
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      changeTheme,
      darkMode,
      toggleDarkMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 