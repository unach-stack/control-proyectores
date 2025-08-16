export const themeGradients = {
  default: {
    gradient: 'from-blue-600 to-blue-800',
    hover: 'hover:from-blue-700 hover:to-blue-900',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    background: 'bg-blue-100 dark:bg-blue-900/30',
    deleteGradient: 'from-red-500 to-red-700',
    deleteHover: 'hover:from-red-600 hover:to-red-800',
    deleteBorder: 'focus:ring-red-300 dark:focus:ring-red-700',
    cancelButton: 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-600',
    sidebarGradient: 'from-blue-700 to-blue-900'
  },
  purple: {
    gradient: 'from-purple-600 to-purple-900',
    hover: 'hover:from-purple-700 hover:to-purple-900',
    border: 'border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    background: 'bg-purple-100 dark:bg-purple-900/30',
    deleteGradient: 'from-purple-500 to-red-500',
    deleteHover: 'hover:from-purple-600 hover:to-red-600',
    deleteBorder: 'focus:ring-purple-300 dark:focus:ring-purple-700',
    cancelButton: 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-600',
    sidebarGradient: 'from-purple-700 to-purple-900'
  },
  green: {
    gradient: 'from-emerald-600 to-emerald-900',
    hover: 'hover:from-emerald-700 hover:to-emerald-900',
    border: 'border-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    background: 'bg-emerald-100 dark:bg-emerald-900/30',
    deleteGradient: 'from-red-500 to-orange-500',
    deleteHover: 'hover:from-red-600 hover:to-orange-600',
    deleteBorder: 'focus:ring-red-300 dark:focus:ring-red-700',
    cancelButton: 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-600',
    sidebarGradient: 'from-emerald-700 to-emerald-900'
  },
  ocean: {
    gradient: 'from-cyan-600 to-blue-900',
    hover: 'hover:from-cyan-700 hover:to-blue-900',
    border: 'border-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    background: 'bg-cyan-100 dark:bg-cyan-900/30',
    deleteGradient: 'from-red-500 to-blue-700',
    deleteHover: 'hover:from-red-600 hover:to-blue-800',
    deleteBorder: 'focus:ring-cyan-300 dark:focus:ring-cyan-700',
    cancelButton: 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-600',
    sidebarGradient: 'from-cyan-700 to-blue-900'
  },
  sunset: {
    gradient: 'from-orange-500 to-pink-800',
    hover: 'hover:from-orange-600 hover:to-pink-900',
    border: 'border-orange-500',
    text: 'text-orange-500 dark:text-orange-400',
    background: 'bg-orange-100 dark:bg-orange-900/30',
    deleteGradient: 'from-orange-500 to-red-600',
    deleteHover: 'hover:from-orange-600 hover:to-red-700',
    deleteBorder: 'focus:ring-orange-300 dark:focus:ring-orange-700',
    cancelButton: 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-600',
    sidebarGradient: 'from-orange-600 to-pink-800'
  }
};

// Helper para obtener el gradiente actual
export const getCurrentThemeStyles = (currentTheme) => {
  return themeGradients[currentTheme] || themeGradients.default;
}; 