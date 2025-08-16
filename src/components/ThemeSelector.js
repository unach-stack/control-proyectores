import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const themes = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      primary: 'from-[#214DC5] to-blue-900',
      dark: 'dark:from-gray-800 dark:to-gray-900'
    }
  },
  {
    id: 'purple',
    name: 'Púrpura',
    colors: {
      primary: 'from-purple-600 to-purple-900',
      dark: 'dark:from-purple-900 dark:to-gray-900'
    }
  },
  {
    id: 'green',
    name: 'Verde',
    colors: {
      primary: 'from-emerald-600 to-emerald-900',
      dark: 'dark:from-emerald-900 dark:to-gray-900'
    }
  },
  {
    id: 'ocean',
    name: 'Océano',
    colors: {
      primary: 'from-cyan-600 to-blue-900',
      dark: 'dark:from-cyan-900 dark:to-gray-900'
    }
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    colors: {
      primary: 'from-orange-500 to-pink-800',
      dark: 'dark:from-orange-900 dark:to-gray-900'
    }
  }
];

const ThemeSelector = () => {
  const { currentTheme, changeTheme, darkMode, toggleDarkMode } = useTheme();
  const { updateUserData } = useAuth();

  const handleThemeChange = async (themeId) => {
    try {
      // Actualizar el tema y mantener el darkMode
      await changeTheme(themeId);
      
      // Actualizar en el backend
      await updateUserData({ 
        theme: themeId,
        darkMode // Incluir el darkMode actual
      });
      
      toast.success('Tema actualizado correctamente');
    } catch (error) {
      console.error('Error al cambiar el tema:', error);
      toast.error('Error al cambiar el tema');
    }
  };

  // Agregar toggle para darkMode
  const handleDarkModeToggle = async () => {
    try {
      await toggleDarkMode(!darkMode);
      await updateUserData({ darkMode: !darkMode });
    } catch (error) {
      console.error('Error al cambiar modo oscuro:', error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
        Temas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {themes.map((theme) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleThemeChange(theme.id)}
            className={`relative h-24 rounded-xl overflow-hidden 
                      transition-all duration-300 
                      ${currentTheme === theme.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.colors.primary}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white text-sm font-medium">{theme.name}</span>
              {currentTheme === theme.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 mt-1 rounded-full bg-white"
                />
              )}
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        Puedes cambiar el tema en cualquier momento
      </p>
    </div>
  );
};

export default ThemeSelector; 