import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, GraduationCap, Users, Clock, FileText,
  Edit3, Upload, CheckCircle, AlertCircle, XCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';
import { useAuth } from '../hooks/useAuth';
import { BACKEND_URL } from '../config/config';

// ─── Module-level helpers ─────────────────────────────────────────────────────

function formatTimeLeft(expirationDate) {
  const diff = new Date(expirationDate) - new Date();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('jwtToken');
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

const CORRECTION_FIELD_LABELS = ['grado', 'grupo', 'turno', 'nombre'];

// ─── Pure sub-components (defined outside parent to avoid remounting) ─────────

const InfoRow = ({ icon: Icon, label, value, themeText }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${themeText}`}>
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{value || '—'}</p>
    </div>
  </div>
);

const Badge = ({ variant, children }) => {
  const variants = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
    red:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};

const SectionCard = ({ title, icon: Icon, themeText, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <Icon size={20} className={themeText} />
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// Extracted from UserProfile to avoid redefinition on every render (rerender-no-inline-components)
const CorrectionForm = ({ styles, correctionFields, setCorrectionFields, justificacion, setJustificacion, submittingCorrection, onSubmit, onCancel }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 space-y-4"
  >
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">¿Qué campos necesitas corregir?</p>
    <div className="grid grid-cols-2 gap-2">
      {CORRECTION_FIELD_LABELS.map((campo) => (
        <label key={campo} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={correctionFields[campo]}
            onChange={(e) => setCorrectionFields(prev => ({ ...prev, [campo]: e.target.checked }))}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200 capitalize">{campo}</span>
        </label>
      ))}
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Justificación <span className="text-gray-400">({justificacion.length}/500)</span>
      </label>
      <textarea
        value={justificacion}
        onChange={(e) => setJustificacion(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Explica por qué necesitas corregir estos datos..."
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
    <div className="flex gap-2">
      <button
        onClick={onSubmit}
        disabled={submittingCorrection}
        className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${styles.gradient} ${styles.hover} disabled:opacity-50 transition-all shadow-md`}
      >
        {submittingCorrection ? 'Enviando...' : 'Enviar solicitud'}
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all"
      >
        Cancelar
      </button>
    </div>
  </motion.div>
);

// Extracted from UserProfile to avoid redefinition on every render (rerender-no-inline-components)
const CorrectionStatus = ({
  loadingCorrection,
  correctionRequest,
  correctionWindowActive,
  timeLeft,
  showCorrectionForm,
  setShowCorrectionForm,
  styles,
  correctionFields,
  setCorrectionFields,
  justificacion,
  setJustificacion,
  submittingCorrection,
  onSubmitCorrection,
  onCancelCorrectionForm,
}) => {
  if (loadingCorrection) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <RefreshCw size={14} className="animate-spin" />
        <span>Verificando estado...</span>
      </div>
    );
  }

  const formProps = {
    styles,
    correctionFields,
    setCorrectionFields,
    justificacion,
    setJustificacion,
    submittingCorrection,
    onSubmit: onSubmitCorrection,
    onCancel: onCancelCorrectionForm,
  };

  const openFormButton = (label) => (
    <button
      onClick={() => setShowCorrectionForm(true)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${styles.gradient} ${styles.hover} transition-all shadow-md`}
    >
      <Edit3 size={14} />
      {label}
    </button>
  );

  if (!correctionRequest) {
    return (
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Si necesitas corregir tus datos de perfil, envía una solicitud. Un administrador la revisará.
        </p>
        {showCorrectionForm ? (
          <CorrectionForm {...formProps} />
        ) : (
          openFormButton('Solicitar corrección de datos')
        )}
      </div>
    );
  }

  if (correctionRequest.estado === 'pendiente') {
    return (
      <div className="space-y-3">
        <Badge variant="amber">
          <Clock size={13} />
          Solicitud pendiente de revisión
        </Badge>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Campos solicitados:{' '}
          <span className="font-semibold">{(correctionRequest.camposACorregir || []).join(', ')}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{correctionRequest.justificacion}"</p>
      </div>
    );
  }

  if (correctionRequest.estado === 'aprobado') {
    if (correctionWindowActive && timeLeft) {
      return (
        <div className="space-y-2">
          <Badge variant="green">
            <CheckCircle size={13} />
            Ventana de edición activa (te quedan {timeLeft})
          </Badge>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Puedes editar tu perfil usando el formulario en la sección superior.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <Badge variant="amber">
          <AlertCircle size={13} />
          Ventana de edición expirada
        </Badge>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          El periodo de edición ha concluido. Puedes enviar una nueva solicitud si aún necesitas corregir tus datos.
        </p>
        {showCorrectionForm ? (
          <CorrectionForm {...formProps} />
        ) : (
          openFormButton('Enviar nueva solicitud')
        )}
      </div>
    );
  }

  if (correctionRequest.estado === 'rechazado') {
    return (
      <div className="space-y-3">
        <Badge variant="red">
          <XCircle size={13} />
          Solicitud rechazada
        </Badge>
        {correctionRequest.motivoRechazo ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Motivo:</span> {correctionRequest.motivoRechazo}
          </p>
        ) : null}
        {showCorrectionForm ? (
          <CorrectionForm {...formProps} />
        ) : (
          openFormButton('Enviar nueva solicitud')
        )}
      </div>
    );
  }

  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UserProfile = () => {
  const { currentTheme } = useTheme();
  const styles = getCurrentThemeStyles(currentTheme);
  const { user, userPicture, updateUserData } = useAuth();

  // ── Correction state ──────────────────────────────────────────────────────
  const [correctionRequest, setCorrectionRequest] = useState(null);
  const [loadingCorrection, setLoadingCorrection] = useState(true);

  // ── Edit form state ───────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({ grado: '', grupo: '', turno: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // ── New correction request form ───────────────────────────────────────────
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionFields, setCorrectionFields] = useState({ grado: false, grupo: false, turno: false, nombre: false });
  const [justificacion, setJustificacion] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // ── PDF upload state ──────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Use primitive deps to avoid refetching when unrelated user fields change (rerender-dependencies)
  const userGrado = user?.grado;
  const userGrupo = user?.grupo;
  const userTurno = user?.turno;

  // ── Fetch correction status ───────────────────────────────────────────────
  const fetchCorrection = useCallback(async () => {
    setLoadingCorrection(true);
    try {
      const res = await apiFetch('/api/perfil-correction');
      if (!res.ok) throw new Error('Error fetching');
      const data = await res.json();
      const requests = Array.isArray(data) ? data : (data.corrections || []);
      const latest = requests.length > 0 ? requests[requests.length - 1] : null;
      setCorrectionRequest(latest);

      if (latest?.estado === 'aprobado' && latest.fechaExpiracion && new Date(latest.fechaExpiracion) > new Date()) {
        setEditForm({
          grado: userGrado?.toString() || '',
          grupo: userGrupo || '',
          turno: userTurno || '',
        });
      }
    } catch {
      // Silent fail — correction section will show "no request" state
    } finally {
      setLoadingCorrection(false);
    }
  }, [userGrado, userGrupo, userTurno]);

  useEffect(() => {
    if (user) fetchCorrection();
  }, [user, fetchCorrection]);

  // ── Correction window helpers ─────────────────────────────────────────────
  const correctionWindowActive =
    correctionRequest?.estado === 'aprobado' &&
    !!correctionRequest?.fechaExpiracion &&
    new Date(correctionRequest.fechaExpiracion) > new Date();

  const timeLeft = correctionWindowActive ? formatTimeLeft(correctionRequest.fechaExpiracion) : null;

  // ── Save profile changes ──────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingEdit(true);
    try {
      const res = await apiFetch('/update-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      updateUserData(editForm);
      toast.success('Perfil actualizado correctamente');
      await fetchCorrection();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el perfil');
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Submit correction request ─────────────────────────────────────────────
  const handleSubmitCorrectionRequest = async () => {
    const camposACorregir = Object.entries(correctionFields)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (camposACorregir.length === 0) {
      toast.error('Selecciona al menos un campo a corregir');
      return;
    }
    if (!justificacion.trim()) {
      toast.error('Escribe una justificación');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await apiFetch('/api/perfil-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camposACorregir, justificacion: justificacion.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar');
      toast.success('Solicitud enviada correctamente');
      setShowCorrectionForm(false);
      setJustificacion('');
      setCorrectionFields({ grado: false, grupo: false, turno: false, nombre: false });
      await fetchCorrection();
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar la solicitud');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleCancelCorrectionForm = () => {
    setShowCorrectionForm(false);
    setJustificacion('');
    setCorrectionFields({ grado: false, grupo: false, turno: false, nombre: false });
  };

  // ── PDF upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/upload-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir el archivo');
      toast.success('PDF subido correctamente');
      setFile(null);
    } catch (err) {
      toast.error(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <RefreshCw size={24} className={`animate-spin ${styles.text}`} />
      </div>
    );
  }

  const turnoLabel =
    user.turno === 'Matutino' ? 'Matutino' :
    user.turno === 'Vespertino' ? 'Vespertino' :
    user.turno;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6 p-4 lg:p-0"
    >
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center shadow-lg`}>
          <User size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mi Perfil</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Consulta y gestiona tu información personal</p>
        </div>
      </div>

      {/* ── Section 1: Profile Info Card ── */}
      <SectionCard title="Información de perfil" icon={User} themeText={styles.text}>
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {(userPicture || user.picture) ? (
              <img
                src={userPicture || user.picture}
                alt={user.nombre}
                className="w-20 h-20 rounded-2xl object-cover shadow-md ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800"
              />
            ) : (
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center shadow-md`}>
                <span className="text-2xl font-bold text-white">
                  {user.nombre ? user.nombre[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
            {(correctionWindowActive && timeLeft) ? (
              <Badge variant="green">
                <CheckCircle size={11} />
                {timeLeft}
              </Badge>
            ) : null}
          </div>

          {/* Info rows */}
          <div className="flex-1 min-w-0">
            <InfoRow icon={User}          label="Nombre"  value={user.nombre}   themeText={styles.text} />
            <InfoRow icon={Mail}          label="Correo"  value={user.email}    themeText={styles.text} />
            <InfoRow icon={GraduationCap} label="Grado"   value={user.grado ? `${user.grado}°` : null} themeText={styles.text} />
            <InfoRow icon={Users}         label="Grupo"   value={user.grupo}    themeText={styles.text} />
            <InfoRow icon={Clock}         label="Turno"   value={turnoLabel}    themeText={styles.text} />
          </div>
        </div>

        {/* Editable form — only shown when correction window is active */}
        {correctionWindowActive ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 space-y-4"
          >
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Edit3 size={14} className={styles.text} />
              Editar datos de perfil
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grado</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={editForm.grado}
                  onChange={(e) => setEditForm(prev => ({ ...prev, grado: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grupo</label>
                <input
                  type="text"
                  maxLength={3}
                  value={editForm.grupo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, grupo: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A, B, C..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Turno</label>
                <select
                  value={editForm.turno}
                  onChange={(e) => setEditForm(prev => ({ ...prev, turno: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="Matutino">Matutino</option>
                  <option value="Vespertino">Vespertino</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingEdit}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${styles.gradient} ${styles.hover} disabled:opacity-50 transition-all shadow-md`}
            >
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </motion.div>
        ) : (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              disabled
              title="Solicita una corrección de datos para poder editar tu perfil"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed"
            >
              <Edit3 size={14} />
              Editar perfil
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Solo disponible cuando una solicitud de corrección es aprobada.
            </p>
          </div>
        )}
      </SectionCard>

      {/* ── Section 2: Correction Request ── */}
      <SectionCard title="Solicitud de corrección de datos" icon={Edit3} themeText={styles.text}>
        <CorrectionStatus
          loadingCorrection={loadingCorrection}
          correctionRequest={correctionRequest}
          correctionWindowActive={correctionWindowActive}
          timeLeft={timeLeft}
          showCorrectionForm={showCorrectionForm}
          setShowCorrectionForm={setShowCorrectionForm}
          styles={styles}
          correctionFields={correctionFields}
          setCorrectionFields={setCorrectionFields}
          justificacion={justificacion}
          setJustificacion={setJustificacion}
          submittingCorrection={submittingCorrection}
          onSubmitCorrection={handleSubmitCorrectionRequest}
          onCancelCorrectionForm={handleCancelCorrectionForm}
        />
      </SectionCard>

      {/* ── Section 3: PDF Upload ── */}
      <SectionCard title="Subir documento PDF" icon={FileText} themeText={styles.text}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Sube tu documento semanal en formato PDF (máximo 2 MB). Solo se permite un documento por semana.
        </p>
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-700/30">
            <Upload size={22} className="text-gray-400 dark:text-gray-500 mb-1" />
            {file ? (
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate max-w-xs px-2">
                {file.name}
              </span>
            ) : (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">Haz clic para seleccionar un PDF</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Máximo 2 MB</span>
              </>
            )}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </label>

          <button
            onClick={handleFileUpload}
            disabled={!file || uploading}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${styles.gradient} ${styles.hover} disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2`}
          >
            <Upload size={15} />
            {uploading ? 'Subiendo...' : 'Subir PDF'}
          </button>
        </div>
      </SectionCard>
    </motion.div>
  );
};

export default UserProfile;
