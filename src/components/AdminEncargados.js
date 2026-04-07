import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, Clock, UserPlus, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { fetchFromAPI } from '../utils/fetchHelper';
import { alertaExito, alertaError } from './Alert';

// ─── Utilidad de semana ISO (espejo del backend) ──────────────────────────────
function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMondayOfWeek(semana) {
  const [year, weekStr] = semana.split('-W');
  const y = parseInt(year, 10);
  const w = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (w - 1) * 7);
  return monday;
}

function getNextWeek(semana) {
  const monday = getMondayOfWeek(semana);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return getISOWeek(monday);
}

function getPrevWeek(semana) {
  const monday = getMondayOfWeek(semana);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return getISOWeek(monday);
}

function formatSemana(semana) {
  const monday = getMondayOfWeek(semana);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  return `${monday.toLocaleDateString('es-MX', opts)} – ${friday.toLocaleDateString('es-MX', { ...opts, year: 'numeric' })}`;
}

// ─── Modal: Asignar Directo ───────────────────────────────────────────────────
const ModalAsignarDirecto = ({ grupo, semana, onClose, onSuccess }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await fetchFromAPI('/usuarios');
        const filtrados = (data.usuarios || data).filter(
          u => !u.isAdmin && u.grado === grupo.grado && u.grupo === grupo.grupo && u.turno === grupo.turno
        );
        setUsuarios(filtrados);
      } catch {
        alertaError('Error al cargar usuarios del grupo');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupo]);

  const handleAsignar = async () => {
    if (!usuarioSeleccionado) return;
    setGuardando(true);
    try {
      await fetchFromAPI('/api/encargado/asignar-directo', {
        method: 'POST',
        body: JSON.stringify({ usuarioId: usuarioSeleccionado, semana })
      });
      alertaExito('Encargado asignado correctamente');
      onSuccess();
      onClose();
    } catch (err) {
      alertaError(err.message || 'Error al asignar encargado');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Asignar Encargado Directo
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {grupo.grado}° {grupo.grupo} — {grupo.turno} · {semana}
        </p>

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Cargando usuarios...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay usuarios con perfil completo en este grupo.</p>
        ) : (
          <select
            value={usuarioSeleccionado}
            onChange={e => setUsuarioSeleccionado(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
          >
            <option value="">Selecciona un usuario</option>
            {usuarios.map(u => (
              <option key={u._id} value={u._id}>{u.nombre} ({u.email})</option>
            ))}
          </select>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={!usuarioSeleccionado || guardando}
            className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {guardando ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Badge de estado ──────────────────────────────────────────────────────────
const EstadoBadge = ({ grupo }) => {
  if (grupo.encargadoActivo) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle className="w-3 h-3" />
        Designado
      </span>
    );
  }
  if (grupo.postulantes.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
        <Clock className="w-3 h-3" />
        {grupo.postulantes.length} postulante{grupo.postulantes.length > 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
      <AlertCircle className="w-3 h-3" />
      Sin postulantes
    </span>
  );
};

// ─── Tarjeta de grupo ─────────────────────────────────────────────────────────
const GrupoCard = ({ grupo, semana, onDesignar, onAsignarDirecto, themeStyles }) => {
  const [expandido, setExpandido] = useState(false);
  const [designando, setDesignando] = useState(null);

  const handleDesignar = async (encargadoId) => {
    setDesignando(encargadoId);
    try {
      await onDesignar(encargadoId);
    } finally {
      setDesignando(null);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header de la tarjeta */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${themeStyles.gradient} flex items-center justify-center shrink-0`}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">
              {grupo.grado}° {grupo.grupo}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {grupo.turno} · {grupo.totalUsuarios} alumnos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <EstadoBadge grupo={grupo} />
          <motion.div animate={{ rotate: expandido ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft className="w-4 h-4 text-gray-400 -rotate-90" />
          </motion.div>
        </div>
      </div>

      {/* Contenido expandible */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">

              {/* Encargado activo */}
              {grupo.encargadoActivo && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Encargado designado</p>
                  <div className="flex items-center gap-2">
                    {grupo.encargadoActivo.usuarioId?.picture && (
                      <img src={grupo.encargadoActivo.usuarioId.picture} alt="" className="w-7 h-7 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {grupo.encargadoActivo.usuarioId?.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {grupo.encargadoActivo.tipo === 'provisional' ? 'Provisional' : 'Titular'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Postulantes */}
              {grupo.postulantes.length > 0 && !grupo.encargadoActivo && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Postulantes
                  </p>
                  <div className="space-y-2">
                    {grupo.postulantes.map(p => (
                      <div key={p._id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          {p.usuarioId?.picture && (
                            <img src={p.usuarioId.picture} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <span className="text-sm text-gray-800 dark:text-gray-200">{p.usuarioId?.nombre}</span>
                        </div>
                        <button
                          onClick={() => handleDesignar(p._id)}
                          disabled={designando === p._id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${themeStyles.gradient} hover:opacity-90 disabled:opacity-50 transition-opacity`}
                        >
                          {designando === p._id ? 'Designando...' : 'Designar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin postulantes / sin encargado → Asignar Directo */}
              {!grupo.encargadoActivo && (
                <button
                  onClick={() => onAsignarDirecto(grupo)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Asignar directamente
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const AdminEncargados = () => {
  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const semanaActual = getISOWeek();
  const semanaSiguiente = getNextWeek(semanaActual);

  const [semana, setSemana] = useState(semanaSiguiente);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalGrupo, setModalGrupo] = useState(null);

  const cargarGrupos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFromAPI(`/api/encargado/grupos?semana=${semana}`);
      setGrupos(data.grupos || []);
    } catch (err) {
      alertaError('Error al cargar grupos: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [semana]);

  useEffect(() => { cargarGrupos(); }, [cargarGrupos]);

  const handleDesignar = async (encargadoId) => {
    try {
      await fetchFromAPI(`/api/encargado/${encargadoId}/designar`, { method: 'PUT' });
      alertaExito('Encargado designado');
      cargarGrupos();
    } catch (err) {
      alertaError(err.message || 'Error al designar encargado');
    }
  };

  // Estadísticas rápidas
  const totalGrupos = grupos.length;
  const conEncargado = grupos.filter(g => g.encargadoActivo).length;
  const conPostulantes = grupos.filter(g => !g.encargadoActivo && g.postulantes.length > 0).length;
  const sinPostulantes = grupos.filter(g => !g.encargadoActivo && g.postulantes.length === 0).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
      {/* Header */}
      <div className={`bg-gradient-to-r ${themeStyles.gradient} px-6 py-8 relative overflow-hidden`}>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <h1 className="text-2xl font-black text-white">Sistema de Encargados</h1>
        <p className="text-white/70 text-sm mt-1">Gestión semanal de encargados por grupo</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4">

        {/* Selector de semana */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => setSemana(prev => getPrevWeek(prev))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-center">
            <p className="font-bold text-gray-900 dark:text-white text-sm">{semana}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatSemana(semana)}</p>
            {semana === semanaActual && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Semana actual
              </span>
            )}
            {semana === semanaSiguiente && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                Próxima semana
              </span>
            )}
          </div>

          <button
            onClick={() => setSemana(prev => getNextWeek(prev))}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total grupos', value: totalGrupos, color: 'text-gray-700 dark:text-gray-200' },
            { label: 'Con encargado', value: conEncargado, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Con postulantes', value: conPostulantes, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Sin postulantes', value: sinPostulantes, color: 'text-red-500 dark:text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Botón refrescar */}
        <div className="flex justify-end mb-4">
          <button
            onClick={cargarGrupos}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {/* Lista de grupos */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No se encontraron grupos con perfil completo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grupos.map(grupo => (
              <GrupoCard
                key={`${grupo.grado}-${grupo.grupo}-${grupo.turno}`}
                grupo={grupo}
                semana={semana}
                onDesignar={handleDesignar}
                onAsignarDirecto={g => setModalGrupo(g)}
                themeStyles={themeStyles}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Asignar Directo */}
      <AnimatePresence>
        {modalGrupo && (
          <ModalAsignarDirecto
            grupo={modalGrupo}
            semana={semana}
            onClose={() => setModalGrupo(null)}
            onSuccess={cargarGrupos}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEncargados;
