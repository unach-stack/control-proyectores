import React from 'react';
import ReactDOM from 'react-dom/client'; // Asegúrate que esto sea 'react-dom/client'
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom'; // Asegúrate de usar BrowserRouter

const root = ReactDOM.createRoot(document.getElementById('root')); // Esto está correcto para React 18
root.render(
    <BrowserRouter> {/* Envuelve la App dentro de BrowserRouter */}
      <App />
    </BrowserRouter>
);

reportWebVitals();
