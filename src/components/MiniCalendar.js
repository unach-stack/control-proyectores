// components/MiniCalendar.js
import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; 
import './MiniCalendar.css';

function MiniCalendar({ date, onChange }) {
  return (
    <div className="mini-calendar">
      <h2>Calendario de Proyectores</h2>
      <p>
        Este calendario te permite seleccionar fechas para la recolección de proyectores.
        Haz clic en una fecha para ver los detalles de las solicitudes.
      </p>
      <Calendar
        onChange={onChange}
        value={date}
      />
    </div>
  );
}

export default MiniCalendar;
