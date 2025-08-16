import React, { useState } from 'react';
import { X, Clock, Calendar, Copy } from 'lucide-react';
import { alertaExito, alertaPersonalizada } from './Alert';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const TimeSelectionModal = ({ show, handleClose, selectedDates, handleConfirm }) => {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const [timeSlots, setTimeSlots] = useState({});
  const [useSameTime, setUseSameTime] = useState(false);
  const [templateTime, setTemplateTime] = useState({ start: '', end: '' });

  // Manejar cambio en horario plantilla
  const handleTemplateChange = (field, value) => {
    setTemplateTime(prev => {
      const newTemplate = { ...prev, [field]: value };
      
      // Si está activada la opción de mismo horario, aplicar a todas las fechas
      if (useSameTime) {
        const newTimeSlots = {};
        selectedDates.forEach(date => {
          newTimeSlots[date] = { ...newTemplate };
        });
        setTimeSlots(newTimeSlots);
      }
      
      return newTemplate;
    });
  };

  // Toggle para usar el mismo horario
  const handleUseSameTimeToggle = () => {
    setUseSameTime(prev => {
      const newValue = !prev;
      
      if (newValue && (templateTime.start || templateTime.end)) {
        // Aplicar horario plantilla a todas las fechas
        const newTimeSlots = {};
        selectedDates.forEach(date => {
          newTimeSlots[date] = { ...templateTime };
        });
        setTimeSlots(newTimeSlots);
      }
      
      return newValue;
    });
  };

  // Manejar cambio de horario individual
  const handleTimeChange = (date, field, value) => {
    if (useSameTime) {
      alertaPersonalizada(
        "Horarios unificados",
        "Desactiva la opción de 'Mismo horario' para establecer horarios individuales",
        "info"
      );
      return;
    }
    
    setTimeSlots(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: value }
    }));
  };

  const onConfirm = () => {
    const allValid = Object.values(timeSlots).every(slot =>
      slot.start && slot.end
    );
  
    if (!allValid) {
      alert("Por favor, asegúrate de que todas las horas de inicio y fin están establecidas.");
      return;
    }
  
    handleConfirm(timeSlots);
    alertaExito();
    handleClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-auto p-4">
        <div className="relative bg-white rounded-xl shadow-2xl dark:bg-gray-800 overflow-hidden">
          {/* Header con el gradiente del tema */}
          <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${themeStyles.gradient}`}>
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6 text-white" />
              <h3 className="text-xl font-semibold text-white">
                Selección de Horarios
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Nuevo: Opción de mismo horario */}
          <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/30 border-b 
                        border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSameTime}
                  onChange={handleUseSameTimeToggle}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 
                           focus:ring-blue-500 dark:border-gray-600"
                />
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  Usar el mismo horario para todos los días
                </span>
              </label>
              <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Plantilla de horario cuando useSameTime está activo */}
          {useSameTime && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <input
                    type="time"
                    value={templateTime.start}
                    onChange={(e) => handleTemplateChange('start', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:border-blue-500 dark:focus:border-blue-400 
                             text-sm shadow-sm"
                  />
                  <label className="absolute -top-2 left-2 -mt-px inline-block px-1 
                                  bg-white dark:bg-gray-700 text-xs font-medium 
                                  text-gray-900 dark:text-gray-300">
                    Hora de inicio
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="time"
                    value={templateTime.end}
                    onChange={(e) => handleTemplateChange('end', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:border-blue-500 dark:focus:border-blue-400 
                             text-sm shadow-sm"
                  />
                  <label className="absolute -top-2 left-2 -mt-px inline-block px-1 
                                  bg-white dark:bg-gray-700 text-xs font-medium 
                                  text-gray-900 dark:text-gray-300">
                    Hora de fin
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Lista de fechas */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {selectedDates.map(date => (
                <div key={date} 
                     className={`rounded-lg bg-gray-50 dark:bg-gray-700 p-4 
                               shadow-sm transition-shadow duration-200
                               ${useSameTime ? 'opacity-75' : 'hover:shadow-md'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {/* Inputs de tiempo deshabilitados si useSameTime está activo */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Input de hora de inicio */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 
                                       group-hover:text-blue-500 dark:group-hover:text-blue-400 
                                       transition-colors duration-200" />
                      </div>
                      <input
                        type="time"
                        className="block w-full rounded-lg 
                                 border-gray-300 dark:border-gray-600 
                                 bg-white dark:bg-gray-700
                                 text-gray-900 dark:text-gray-100
                                 pl-10 
                                 focus:border-blue-500 dark:focus:border-blue-400 
                                 focus:ring-blue-500 dark:focus:ring-blue-400
                                 hover:border-blue-400 dark:hover:border-blue-300 
                                 transition-colors duration-200
                                 text-sm shadow-sm"
                        onChange={(e) => handleTimeChange(date, 'start', e.target.value)}
                        placeholder="Hora de inicio"
                        disabled={useSameTime}
                      />
                      <label className="absolute -top-2 left-2 -mt-px inline-block px-1 
                                      bg-gray-50 dark:bg-gray-700
                                      text-xs font-medium 
                                      text-gray-900 dark:text-gray-300">
                        Hora de inicio
                      </label>
                    </div>
                    
                    {/* Input de hora de fin */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 
                                       group-hover:text-blue-500 dark:group-hover:text-blue-400 
                                       transition-colors duration-200" />
                      </div>
                      <input
                        type="time"
                        className="block w-full rounded-lg 
                                 border-gray-300 dark:border-gray-600 
                                 bg-white dark:bg-gray-700
                                 text-gray-900 dark:text-gray-100
                                 pl-10 
                                 focus:border-blue-500 dark:focus:border-blue-400 
                                 focus:ring-blue-500 dark:focus:ring-blue-400
                                 hover:border-blue-400 dark:hover:border-blue-300 
                                 transition-colors duration-200
                                 text-sm shadow-sm"
                        onChange={(e) => handleTimeChange(date, 'end', e.target.value)}
                        placeholder="Hora de fin"
                        disabled={useSameTime}
                      />
                      <label className="absolute -top-2 left-2 -mt-px inline-block px-1 
                                      bg-gray-50 dark:bg-gray-700
                                      text-xs font-medium 
                                      text-gray-900 dark:text-gray-300">
                        Hora de fin
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 
                        border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-row-reverse gap-3">
              <button
                onClick={onConfirm}
                className={`inline-flex justify-center items-center rounded-lg px-4 py-2.5
                         bg-gradient-to-r ${themeStyles.gradient} text-white font-medium
                         hover:opacity-90 focus:ring-4 focus:ring-opacity-50
                         transition-all duration-200 transform hover:scale-105`}
              >
                <Clock className="h-4 w-4 mr-2" />
                Confirmar Horarios
              </button>
              <button
                onClick={handleClose}
                className="inline-flex justify-center items-center rounded-lg px-4 py-2.5
                         border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 
                         text-gray-700 dark:text-gray-300 font-medium
                         hover:bg-gray-50 dark:hover:bg-gray-700 
                         focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700
                         transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSelectionModal;
