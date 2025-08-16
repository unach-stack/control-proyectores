import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faChartBar, faCalendarAlt, faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import ReportCharts from './ReportCharts';

function ReportGenerator() {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: getLastMonthDate(),
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    estado: 'todos', // 'todos', 'pendiente', 'aprobado', 'rechazado'
    turno: 'todos' // 'todos', 'matutino', 'vespertino'
  });
  const reportRef = useRef(null);

  // Función para obtener la fecha de hace un mes
  function getLastMonthDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Limpiar errores anteriores al iniciar la carga
    try {
      console.log('Solicitando datos de reporte con parámetros:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        estado: filterOptions.estado,
        turno: filterOptions.turno
      });

      const response = await authService.api.get('/api/reports', { 
        params: { 
          startDate: dateRange.startDate, 
          endDate: dateRange.endDate, 
          estado: filterOptions.estado, 
          turno: filterOptions.turno 
        } 
      });

      console.log('Respuesta de la API de reportes:', response.data);
      setReportData(response.data);
    } catch (error) {
      console.error('Error al obtener datos del reporte:', error);
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      setReportData(null); // Limpiar datos anteriores en caso de error

      // Guardar el error para mostrarlo al usuario
      if (error.response?.status === 401) {
        setError('No tienes permisos para acceder a este reporte. Verifica tu sesión.');
      } else if (error.response?.status === 403) {
        setError('Acceso denegado. Solo los administradores pueden ver este reporte.');
      } else if (error.response?.status === 500) {
        setError('Error del servidor. Intenta nuevamente más tarde.');
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        setError('Error de conexión. Verifica tu conexión a internet.');
      } else {
        setError(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, filterOptions]);

  useEffect(() => {
    console.log('ReportGenerator: useEffect activado para obtener datos...');
    fetchReportData();
  }, [fetchReportData]);

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleFilterChange = (e) => {
    setFilterOptions({
      ...filterOptions,
      [e.target.name]: e.target.value
    });
  };

  const generatePDF = async () => {
    if (!reportData) return;

    try {
      setIsLoading(true);
      
      // Mostrar mensaje de procesamiento
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });
      
      Toast.fire({
        icon: 'info',
        title: 'Generando reporte PDF, por favor espere...'
      });
      
      // Crear nuevo documento PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Configurar estilos
      const titleFontSize = 20;
      const subtitleFontSize = 16;
      const normalFontSize = 12;
      const smallFontSize = 10;
      
      // Encabezado institucional
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD AUTÓNOMA DE CHIAPAS', 105, 20, { align: 'center' });
      doc.text('SISTEMA DE CONTROL DE PROYECTORES', 105, 30, { align: 'center' });
      
      // Título principal
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('BITÁCORA DE REPORTE DE SOLICITUDES', 105, 45, { align: 'center' });
      
      // Información del reporte
      doc.setFontSize(normalFontSize);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período del Reporte: ${new Date(dateRange.startDate).toLocaleDateString('es-ES')} - ${new Date(dateRange.endDate).toLocaleDateString('es-ES')}`, 20, 60);
      doc.text(`Fecha de Generación: ${new Date().toLocaleDateString('es-ES')}`, 20, 70);
      doc.text(`Hora de Generación: ${new Date().toLocaleTimeString('es-ES')}`, 20, 80);
      
      // Resumen ejecutivo
      doc.setFontSize(subtitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN EJECUTIVO', 20, 100);
      
      doc.setFontSize(normalFontSize);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Solicitudes: ${reportData.totalSolicitudes}`, 20, 115);
      doc.text(`Solicitudes Aprobadas: ${reportData.solicitudesPorEstado.aprobado}`, 20, 125);
      doc.text(`Solicitudes Pendientes: ${reportData.solicitudesPorEstado.pendiente}`, 20, 135);
      doc.text(`Solicitudes Rechazadas: ${reportData.solicitudesPorEstado.rechazado}`, 20, 145);
      
      // Tabla de solicitudes por estado
      doc.setFontSize(subtitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('SOLICITUDES POR ESTADO', 20, 170);
      
      const estadoData = [
        ['Estado', 'Cantidad', 'Porcentaje'],
        ['Pendientes', reportData.solicitudesPorEstado.pendiente.toString(), `${Math.round((reportData.solicitudesPorEstado.pendiente / reportData.totalSolicitudes) * 100)}%`],
        ['Aprobadas', reportData.solicitudesPorEstado.aprobado.toString(), `${Math.round((reportData.solicitudesPorEstado.aprobado / reportData.totalSolicitudes) * 100)}%`],
        ['Rechazadas', reportData.solicitudesPorEstado.rechazado.toString(), `${Math.round((reportData.solicitudesPorEstado.rechazado / reportData.totalSolicitudes) * 100)}%`]
      ];
      
      autoTable(doc, {
        head: [estadoData[0]],
        body: estadoData.slice(1),
        startY: 180,
        styles: {
          fontSize: normalFontSize,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      // Análisis de proyectores
      const proyectoresY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(subtitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO ACTUAL DE PROYECTORES', 20, proyectoresY);
      
      doc.setFontSize(normalFontSize);
      doc.setFont('helvetica', 'normal');
      doc.text(`Proyectores Disponibles: ${reportData.proyectoresPorEstado.disponible}`, 20, proyectoresY + 15);
      doc.text(`Proyectores en Uso: ${reportData.proyectoresPorEstado.enUso}`, 20, proyectoresY + 25);
      doc.text(`Proyectores en Mantenimiento: ${reportData.proyectoresPorEstado.mantenimiento}`, 20, proyectoresY + 35);
      
      // Tabla de solicitudes por turno
      const turnoY = proyectoresY + 50;
      doc.setFontSize(subtitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('SOLICITUDES POR TURNO', 20, turnoY);
      
      const turnoData = [
        ['Turno', 'Cantidad', 'Porcentaje', 'Tendencia'],
        ['Matutino', reportData.solicitudesPorTurno.matutino.toString(), `${Math.round((reportData.solicitudesPorTurno.matutino / reportData.totalSolicitudes) * 100)}%`, reportData.solicitudesPorTurno.matutino > reportData.solicitudesPorTurno.vespertino ? 'Mayor demanda' : 'Demanda moderada'],
        ['Vespertino', reportData.solicitudesPorTurno.vespertino.toString(), `${Math.round((reportData.solicitudesPorTurno.vespertino / reportData.totalSolicitudes) * 100)}%`, reportData.solicitudesPorTurno.vespertino > reportData.solicitudesPorTurno.matutino ? 'Mayor demanda' : 'Demanda moderada']
      ];
      
      autoTable(doc, {
        head: [turnoData[0]],
        body: turnoData.slice(1),
        startY: turnoY + 10,
        styles: {
          fontSize: normalFontSize,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [46, 204, 113],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 50 },
        },
      });
      
      // Tabla de últimas solicitudes (Bitácora principal)
      const ultimasY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(subtitleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('BITÁCORA DE SOLICITUDES RECIENTES', 20, ultimasY);
      
      const ultimasData = [
        ['No.', 'Usuario', 'Fecha', 'Turno', 'Estado', 'Observaciones']
      ];
      
      reportData.ultimasSolicitudes.forEach((solicitud, index) => {
        ultimasData.push([
          (index + 1).toString(),
          solicitud.usuario,
          solicitud.fecha,
          solicitud.turno,
          solicitud.estado,
          solicitud.estado === 'aprobado' ? 'Solicitud aprobada' : 
          solicitud.estado === 'pendiente' ? 'En revisión' : 'Solicitud rechazada'
        ]);
      });
      
      autoTable(doc, {
        head: [ultimasData[0]],
        body: ultimasData.slice(1),
        startY: ultimasY + 10,
        styles: {
          fontSize: smallFontSize,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 },
        },
      });
      
      // Pie de página institucional
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 270, 190, 270);
        
        doc.setFontSize(smallFontSize);
        doc.setFont('helvetica', 'italic');
        doc.text(`Página ${i} de ${pageCount}`, 105, 280, { align: 'center' });
        doc.text('Sistema de Control de Proyectores - Universidad Autónoma de Chiapas', 105, 285, { align: 'center' });
        doc.text('Este documento es generado automáticamente por el sistema', 105, 290, { align: 'center' });
      }
      
      // Guardar el PDF
      const fileName = `reporte-proyectores-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
        setIsLoading(false);
        
        // Mostrar mensaje de éxito
        Toast.fire({
          icon: 'success',
        title: 'Reporte PDF generado con éxito'
        });
      
    } catch (error) {
      console.error('Error al generar reporte PDF:', error);
      setIsLoading(false);
      
      // Mostrar mensaje de error
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar el reporte PDF. Intente nuevamente.',
        confirmButtonText: 'Entendido'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'aprobado': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rechazado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen w-full p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Generador de Reportes
          </h1>
          <button
            onClick={generatePDF}
            disabled={isLoading || !reportData}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${themeStyles.button} text-white disabled:opacity-50`}
          >
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faFileDownload} />
            )}
            Generar PDF
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} />
            Filtros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <select
                name="estado"
                value={filterOptions.estado}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Turno
              </label>
              <select
                name="turno"
                value={filterOptions.turno}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="todos">Todos</option>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-gray-400" />
          </div>
        ) : reportData ? (
          <div ref={reportRef} className="space-y-6">
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`bg-gradient-to-r ${themeStyles.gradient} rounded-lg shadow-md p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Total Solicitudes</h3>
                    <p className="text-3xl font-bold">{reportData.totalSolicitudes}</p>
                    <p className="text-sm opacity-80">En el período seleccionado</p>
                  </div>
                  <FontAwesomeIcon icon={faChartBar} size="3x" className="opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Solicitudes Aprobadas</h3>
                    <p className="text-3xl font-bold">{reportData.solicitudesPorEstado.aprobado}</p>
                    <p className="text-sm opacity-80">{Math.round((reportData.solicitudesPorEstado.aprobado / reportData.totalSolicitudes) * 100)}% del total</p>
                  </div>
                  <FontAwesomeIcon icon={faChartBar} size="3x" className="opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-md p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Solicitudes Pendientes</h3>
                    <p className="text-3xl font-bold">{reportData.solicitudesPorEstado.pendiente}</p>
                    <p className="text-sm opacity-80">{Math.round((reportData.solicitudesPorEstado.pendiente / reportData.totalSolicitudes) * 100)}% del total</p>
                  </div>
                  <FontAwesomeIcon icon={faChartBar} size="3x" className="opacity-50" />
                </div>
              </div>
            </div>

            {/* Gráficos interactivos */}
            <ReportCharts reportData={reportData} />

            {/* Tabla de últimas solicitudes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarAlt} />
                Últimas Solicitudes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-700">
                      <th className="p-3 text-gray-700 dark:text-gray-200">Usuario</th>
                      <th className="p-3 text-gray-700 dark:text-gray-200">Fecha</th>
                      <th className="p-3 text-gray-700 dark:text-gray-200">Turno</th>
                      <th className="p-3 text-gray-700 dark:text-gray-200">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="dark:text-gray-300">
                    {reportData.ultimasSolicitudes.map((solicitud) => (
                      <tr key={solicitud.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-3">{solicitud.usuario}</td>
                        <td className="p-3">{solicitud.fecha}</td>
                        <td className="p-3">{solicitud.turno}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(solicitud.estado)}`}>
                            {solicitud.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <div className="text-red-500 dark:text-red-400 mb-4">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Error al cargar datos
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={fetchReportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay datos disponibles para el período seleccionado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportGenerator;
