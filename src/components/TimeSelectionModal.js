import React, { useState } from 'react';
import { X, Clock, Calendar, Copy, Phone } from 'lucide-react';
import { alertaExito, alertaPersonalizada, alertaAdvertencia } from './Alert';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const TimeSelectionModal = ({ show, handleClose, selectedDates, handleConfirm }) => {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const [timeSlots, setTimeSlots] = useState({});
  const [useSameTime, setUseSameTime] = useState(false);
  const [templateTime, setTemplateTime] = useState({ start: '', end: '' });
  const [telefono, setTelefono] = useState('');
  const [telefonoError, setTelefonoError] = useState('');

  // --- INICIO DE LÓGICA DE VALIDACIÓN ---

  // Función para obtener la hora mínima de inicio para una fecha dada
  const getMinStartTimeForDate = (dateStr) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;
      // La hora mínima es la actual, pero no antes de las 07:00
      return currentTime > '07:00' ? currentTime : '07:00';
    }
    // Para días futuros, la hora mínima es a las 07:00
    return '07:00';
  };

  // Determinar la hora mínima para la plantilla
  // Si alguna de las fechas es hoy, la plantilla debe respetar la hora actual
  const today = new Date().toISOString().split('T')[0];
  const isTodaySelected = selectedDates.includes(today);
  const templateMinTime = isTodaySelected ? getMinStartTimeForDate(today) : '07:00';

  // --- FIN DE LÓGICA DE VALIDACIÓN ---


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

  const handleTelefonoChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 10) {
      setTelefono(value);
      if (value.length === 10) {
        setTelefonoError('');
      } else {
        setTelefonoError('El número de teléfono debe tener 10 dígitos.');
      }
    }
  };

  const onConfirm = () => {
    // Primero, verificar que se hayan establecido horarios para todas las fechas
    if (Object.keys(timeSlots).length !== selectedDates.length) {
      alertaPersonalizada(
        '¡Horarios Incompletos!',
        'Por favor, establece un horario para todas las fechas seleccionadas.',
        'error'
      );
      return;
    }

    // Validar el número de teléfono
    if (telefono.length !== 10) {
      setTelefonoError('El número de teléfono debe tener 10 dígitos.');
      alertaPersonalizada('¡Teléfono Inválido!', 'Por favor, ingresa un número de teléfono válido de 10 dígitos.', 'error');
      return;
    }

    setTelefonoError('');

    const allValid = Object.values(timeSlots).every(slot => {
      if (!slot.start || !slot.end || slot.start >= slot.end) {
        return false;
      }
      // Validar que la hora esté dentro del rango permitido
      if (slot.start < '07:00' || slot.start > '22:00' || slot.end > '22:00') {
        return false;
      }
      return true;
    });
  
    if (!allValid) {
      alertaPersonalizada(
        '¡Revisa los Horarios!',
        <div>
          <p>Por favor, ajusta las horas seleccionadas.</p>
          <p className="mt-2">
            Recuerda que el rango es de <strong className="text-blue-600 dark:text-blue-400">7:00 AM a 10:00 PM</strong> y la hora de fin debe ser posterior a la de inicio.
          </p>
        </div>,
        'error'
      );
      return;
    }
  
    handleConfirm(timeSlots, telefono);
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
                    min={templateMinTime}
                    max="22:00"
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
                    min={templateTime.start}
                    max="22:00"
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

          {/* Campo para el número de teléfono */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="tel"
                value={telefono}
                onChange={handleTelefonoChange}
                maxLength="10"
                placeholder="Número de teléfono (10 dígitos)"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2 text-sm shadow-sm
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           ${telefonoError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400'}`}
              />
              <label className="absolute -top-2 left-2 -mt-px inline-block px-1 
                                bg-white dark:bg-gray-800 text-xs font-medium 
                                text-gray-900 dark:text-gray-300">
                Teléfono de Contacto
              </label>
            </div>
            {telefonoError && <p className="mt-1 text-xs text-red-500">{telefonoError}</p>}
          </div>

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
                        value={timeSlots[date]?.start || ''}
                        min={getMinStartTimeForDate(date)}
                        max="22:00"
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
                        value={timeSlots[date]?.end || ''}
                        min={timeSlots[date]?.start || getMinStartTimeForDate(date)}
                        max="22:00"
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
