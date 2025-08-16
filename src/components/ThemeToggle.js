import React from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = ({ isDark, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center p-2 rounded-full w-14 h-7 
                 transition-colors duration-300 focus:outline-none
                 bg-blue-100 dark:bg-gray-700"
    >
      <span className={`absolute transform transition-transform duration-300 
                       inline-flex items-center justify-center w-6 h-6 rounded-full 
                       ${isDark ? 'translate-x-7 bg-blue-900' : 'translate-x-0 bg-yellow-500'}`}>
        {isDark ? (
          <FaMoon className="text-white text-sm" />
        ) : (
          <FaSun className="text-white text-sm" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle; 