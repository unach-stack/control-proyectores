import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ReportCharts = ({ reportData }) => {
  // Gráfico de barras para solicitudes por estado
  const estadoChartData = {
    labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
    datasets: [
      {
        label: 'Cantidad de Solicitudes',
        data: [
          reportData.solicitudesPorEstado.pendiente,
          reportData.solicitudesPorEstado.aprobado,
          reportData.solicitudesPorEstado.rechazado,
        ],
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(40, 167, 69, 0.8)',
          'rgba(220, 53, 69, 0.8)',
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(220, 53, 69, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const estadoChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Distribución de Solicitudes por Estado',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Gráfico de dona para solicitudes por turno
  const turnoChartData = {
    labels: ['Matutino', 'Vespertino'],
    datasets: [
      {
        data: [
          reportData.solicitudesPorTurno.matutino,
          reportData.solicitudesPorTurno.vespertino,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const turnoChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Distribución de Solicitudes por Turno',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  // Gráfico de barras para solicitudes por día
  const diaChartData = {
    labels: reportData.solicitudesPorDia.map(item => {
      const fecha = new Date(item.fecha);
      return fecha.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }),
    datasets: [
      {
        label: 'Solicitudes por Día',
        data: reportData.solicitudesPorDia.map(item => item.cantidad),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
      },
    ],
  };

  const diaChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Solicitudes por Día',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Gráfico de estado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <Bar data={estadoChartData} options={estadoChartOptions} />
      </div>

      {/* Gráfico de turno */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <Doughnut data={turnoChartData} options={turnoChartOptions} />
      </div>

      {/* Gráfico de solicitudes por día */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2">
        <Bar data={diaChartData} options={diaChartOptions} />
      </div>
    </div>
  );
};

export default ReportCharts;
