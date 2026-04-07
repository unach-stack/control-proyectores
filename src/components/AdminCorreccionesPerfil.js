import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { BACKEND_URL } from '../config/config';
import toast from 'react-hot-toast';

const FILTROS = ['Pendientes', 'Todas'];

const ESTADO_BADGE = {
  pendiente:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  aprobado:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rechazado:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function authHeaders() {
  const token = sessionStorage.getItem('jwtToken');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function AdminCorreccionesPerfil() {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Pendientes');
  const [rechazandoId, setRechazandoId] = useState(null);
  const [motivoMap, setMotivoMap] = useState({});
  const [procesando, setProcesando] = useState({});

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/perfil-correction`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Error al cargar solicitudes');
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : data.solicitudes || []);
    } catch {
      toast.error('No se pudieron cargar las solicitudes de corrección');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const solicitudesFiltradas = filtro === 'Pendientes'
    ? solicitudes.filter(s => s.estado === 'pendiente')
    : solicitudes;

  const handleAprobar = async (id) => {
    setProcesando(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/perfil-correction/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ estado: 'aprobado' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Solicitud aprobada');
      cargar();
    } catch {
      toast.error('Error al aprobar la solicitud');
    } finally {
      setProcesando(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRechazar = async (id) => {
    const motivo = (motivoMap[id] || '').trim();
    if (!motivo) {
      toast.error('Escribe un motivo de rechazo antes de confirmar');
      return;
    }
    setProcesando(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/perfil-correction/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ estado: 'rechazado', motivoRechazo: motivo }),
      });
      if (!res.ok) throw new Error();
      toast.success('Solicitud rechazada');
      setRechazandoId(null);
      setMotivoMap(prev => { const n = { ...prev }; delete n[id]; return n; });
      cargar();
    } catch {
      toast.error('Error al rechazar la solicitud');
    } finally {
      setProcesando(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-gray-100 dark:bg-gray-900 min-h-screen w-full"
    >
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeStyles.gradient} flex items-center justify-center shadow-md`}>
            <ClipboardCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Correcciones de Perfil</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Solicitudes de corrección de datos enviadas por usuarios</p>
          </div>
          <button
            onClick={cargar}
            className="ml-auto p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-gray-500 dark:text-gray-400`} />
          </button>
        </div>

        {/* Filtro tabs */}
        <div className="flex gap-2 mb-6">
          {FILTROS.map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                ${filtro === f
                  ? `bg-gradient-to-r ${themeStyles.gradient} text-white shadow`
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              {f}
              {f === 'Pendientes' && (
                <span className="ml-1.5 bg-white/25 text-inherit text-xs px-1.5 py-0.5 rounded-full">
                  {solicitudes.filter(s => s.estado === 'pendiente').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-10 text-center border border-gray-100 dark:border-gray-700">
            <ClipboardCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {filtro === 'Pendientes' ? 'No hay solicitudes pendientes' : 'No hay solicitudes registradas'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudesFiltradas.map(sol => (
              <motion.div
                key={sol._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 border border-gray-100 dark:border-gray-700"
              >
                {/* Top row: usuario + estado */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">
                      {sol.usuarioId?.nombre || 'Usuario desconocido'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {sol.usuarioId?.email || '—'}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ESTADO_BADGE[sol.estado] || ''}`}>
                    {sol.estado === 'pendiente' && <Clock className="w-3 h-3" />}
                    {sol.estado === 'aprobado' && <CheckCircle className="w-3 h-3" />}
                    {sol.estado === 'rechazado' && <XCircle className="w-3 h-3" />}
                    {sol.estado}
                  </span>
                </div>

                {/* Campos a corregir */}
                {sol.camposACorregir?.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {sol.camposACorregir.map(campo => (
                      <span key={campo} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-medium">
                        {campo}
                      </span>
                    ))}
                  </div>
                )}

                {/* Justificación */}
                {sol.justificacion && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 mb-3">
                    {sol.justificacion}
                  </p>
                )}

                {/* Fecha */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {sol.createdAt ? new Date(sol.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>

                {/* Acciones (solo para pendientes) */}
                {sol.estado === 'pendiente' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        disabled={procesando[sol._id]}
                        onClick={() => handleAprobar(sol._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        disabled={procesando[sol._id]}
                        onClick={() => setRechazandoId(rechazandoId === sol._id ? null : sol._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>

                    {/* Inline textarea para motivo de rechazo */}
                    {rechazandoId === sol._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <textarea
                          rows={2}
                          placeholder="Motivo de rechazo..."
                          value={motivoMap[sol._id] || ''}
                          onChange={e => setMotivoMap(prev => ({ ...prev, [sol._id]: e.target.value }))}
                          className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        <button
                          disabled={procesando[sol._id]}
                          onClick={() => handleRechazar(sol._id)}
                          className="mt-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          Confirmar rechazo
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
