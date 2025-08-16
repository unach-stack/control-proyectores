import React from 'react';
import { X, Trash2, Calendar, Info } from 'lucide-react';
import { alertaEliminacion, alertaError } from './Alert';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const DeleteEventModal = ({ show, handleClose, handleDelete, events, toggleEventSelection }) => {
    const { currentTheme } = useTheme();
    const themeStyles = getCurrentThemeStyles(currentTheme);

    if (!show) return null;

    const selectedEvents = events.filter(event => event.selected);

    const handleMultipleDelete = () => {
        try {
            if (selectedEvents.length === 0) {
                alertaError('No hay eventos seleccionados para eliminar');
                return;
            }
            
            const selectedEventIds = selectedEvents.map(event => event.id);
            handleDelete(selectedEventIds);
            // La alerta de éxito se mostrará en handleDeleteEvents después de confirmar que todo salió bien
        } catch (error) {
            console.error('Error al procesar la eliminación:', error);
            alertaError('Hubo un error al procesar la eliminación');
        }
    };

    const toggleAllEvents = () => {
        const allSelected = events.every(event => event.selected);
        events.forEach(event => {
            toggleEventSelection(event.id);
        });
    };

    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date)) {
            return 'Fecha no válida';
        }

        try {
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error al formatear la fecha:', error);
            return 'Error en formato de fecha';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl mx-auto p-4">
                <div className="relative bg-white rounded-xl shadow-2xl dark:bg-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${themeStyles.gradient}`}>
                        <div className="flex items-center space-x-2">
                            <Trash2 className="w-6 h-6 text-white" />
                            <h3 className="text-xl font-semibold text-white">
                                Eliminar eventos
                            </h3>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 border-b border-blue-100 dark:border-blue-800">
                        <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Esta acción eliminará los eventos seleccionados de tu Google Calendar. 
                                Esto te ayudará a mantener tu calendario organizado y evitar la saturación 
                                de eventos pasados.
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {events.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={toggleAllEvents}
                                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 
                                                 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white 
                                                 rounded-lg transition-colors flex items-center space-x-2"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        <span>{events.every(event => event.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}</span>
                                    </button>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedEvents.length} eventos seleccionados
                                    </span>
                                </div>
                                
                                <div className="max-h-64 overflow-auto rounded-lg border dark:border-gray-700">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Seleccionar
                                                </th>
                                                <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Título
                                                </th>
                                                <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Fecha
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {events.map(event => (
                                                <tr key={event.id} 
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={event.selected}
                                                            onChange={() => toggleEventSelection(event.id)}
                                                            className="w-4 h-4 text-red-600 rounded border-gray-300 
                                                                     focus:ring-red-500 dark:border-gray-600 
                                                                     dark:bg-gray-700 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-900 dark:text-gray-300">
                                                        {event.summary}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(event.start)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">
                                    No hay eventos disponibles para eliminar.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-700">
                        <button
                            onClick={handleClose}
                            className={`px-4 py-2 rounded-md border ${themeStyles.borderColor || 'border-gray-300'} 
                                     ${themeStyles.cancelButton || 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleMultipleDelete}
                            disabled={selectedEvents.length === 0}
                            className={`px-4 py-2 rounded-md text-white 
                                     ${selectedEvents.length > 0 
                                       ? `bg-gradient-to-r ${themeStyles.deleteGradient || 'from-red-500 to-red-700'} ${themeStyles.deleteHover || 'hover:from-red-600 hover:to-red-800'}`
                                       : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            Eliminar Seleccionados
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteEventModal;