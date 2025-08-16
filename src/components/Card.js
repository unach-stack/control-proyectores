// components/Card.js
import React from 'react';
import './Card.css'; // Asegúrate de crear este archivo CSS

function Card({ title, value }) {
  return (
    <div className="card">
      <h4>{title}</h4>
      <p>{value}</p>
    </div>
  );
}

export default Card;
