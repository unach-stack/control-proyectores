import { Temporal } from '@js-temporal/polyfill';
import React, { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTv, faCalendarPlus, faTrash, faQrcode, faDownload, faShareNodes, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { gapi } from 'gapi-script';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './RequestProjector.css';
import TimeSelectionModal from './TimeSelectionModal';
import DeleteEventModal from './DeleteEventModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeZone } from '../contexts/TimeZoneContext';
import { alertaExito, alertaError } from './Alert';
import { fetchFromAPI } from '../utils/fetchHelper';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentThemeStyles } from '../themes/themeConfig';

const CLIENT_ID = "217386513987-f2uhmkqcb8stdrr04ona8jioh0tgs2j2.apps.googleusercontent.com";
const API_KEY = "AIzaSyCGngj5UlwBeDeynle9K-yImbSTwfgWTFg";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

const ORBS = [
  { w: 120, h: 120, left: '8%',  top: '-20%', dur: 4,   delay: 0 },
  { w: 80,  h: 80,  left: '75%', top: '10%',  dur: 3.5, delay: 0.8 },
  { w: 160, h: 160, left: '50%', top: '-30%', dur: 5,   delay: 0.3 },
  { w: 60,  h: 60,  left: '90%', top: '50%',  dur: 3,   delay: 1.2 },
  { w: 100, h: 100, left: '20%', top: '60%',  dur: 4.5, delay: 0.6 },
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const RequestProjector = () => {
  const { targetTimeZone } = useTimeZone();
  useAuth();
  const [selectedDates, setSelectedDates]     = useState([]);
  const [events, setEvents]                   = useState([]);
  const [showModal, setShowModal]             = useState(false);
  const [showTimeModal, setShowTimeModal]     = useState(false);
  const [qrData, setQrData]                   = useState(null);
  const [shouldSaveQR, setShouldSaveQR]       = useState(false);
  const [justSelected, setJustSelected]       = useState(null);
  const [tick, setTick]                       = useState(0);

  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  // Reloj vivo — tick cada segundo
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Temporal.Now.zonedDateTimeISO(targetTimeZone);
  const timeStr  = now.toPlainTime().toString().split('.')[0];
  const dateStr  = now.toPlainDate().toString();
  const dayName  = DAY_NAMES[new Date().getDay()];
  const monthName = MONTH_NAMES[now.month - 1];

  const dateToTemporal = useCallback((date) => {
    if (!date) return null;
    const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
    return instant.toZonedDateTimeISO(targetTimeZone);
  }, [targetTimeZone]);

  useEffect(() => {
    const loadGapi = async () => {
      try {
        if (!window.gapi) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }
        await new Promise((resolve) => { gapi.load('client:auth2', resolve); });
        await gapi.client.init({ apiKey: API_KEY, clientId: CLIENT_ID, discoveryDocs: DISCOVERY_DOCS, scope: SCOPES });
        const auth2 = gapi.auth2.getAuthInstance();
        const currentUser = auth2.currentUser.get();
        let accessToken = currentUser.getAuthResponse().access_token;
        if (accessToken !== sessionStorage.getItem('accessRequest')) accessToken = sessionStorage.getItem('accessRequest');
        gapi.client.setToken({ access_token: accessToken });
        await fetchEvents();
      } catch (error) { console.error('Error al cargar GAPI:', error); }
    };
    loadGapi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        timeMax: new Date(new Date().getFullYear(), 11, 31).toISOString(),
        singleEvents: true, orderBy: 'startTime', q: 'Solicitud de proyector'
      });
      setEvents(response.result.items.map(event => {
        const startInstant = Temporal.Instant.from(event.start.dateTime || event.start.date);
        const endInstant   = Temporal.Instant.from(event.end.dateTime   || event.end.date);
        return { id: event.id, summary: event.summary, start: new Date(startInstant.epochMilliseconds), end: new Date(endInstant.epochMilliseconds), selected: false };
      }));
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      if (error.status === 401) {
        try {
          const auth2 = gapi.auth2.getAuthInstance();
          await auth2.signIn();
          const cu = auth2.currentUser.get();
          const tok = cu.getAuthResponse().access_token;
          sessionStorage.setItem('accessRequest', tok);
          gapi.client.setToken({ access_token: tok });
          await fetchEvents();
        } catch (e) { console.error('Error al renovar sesión:', e); }
      }
    }
  };

  const createEvent = async (event) => {
    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2) throw new Error('No se pudo obtener auth2');
      if (!auth2.isSignedIn.get()) await auth2.signIn();
      const cu = auth2.currentUser.get();
      gapi.client.setToken({ access_token: cu.getAuthResponse().access_token });
      if (!(event.start instanceof Date) || isNaN(event.start.getTime())) throw new Error('Fecha inicio inválida');
      if (!(event.end   instanceof Date) || isNaN(event.end.getTime()))   throw new Error('Fecha fin inválida');
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: { summary: event.summary, start: { dateTime: event.start.toISOString(), timeZone: targetTimeZone }, end: { dateTime: event.end.toISOString(), timeZone: targetTimeZone } }
      });
      return response.result;
    } catch (error) { console.error('Error al crear evento:', error); throw error; }
  };

  const handleDateChange = (newDate) => {
    if (newDate && newDate instanceof Date && !isNaN(newDate)) {
      const temporalDate = dateToTemporal(newDate).toPlainDate();
      const ds = temporalDate.toString();
      if (selectedDates.includes(ds)) {
        setSelectedDates(selectedDates.filter(d => d !== ds));
      } else {
        setSelectedDates([...selectedDates, ds].sort());
        setJustSelected(ds);
        setTimeout(() => setJustSelected(null), 600);
      }
    }
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;
    const now2 = new Date(); now2.setHours(0,0,0,0);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return true;
    if (date < now2) return true;
    const cd = now2.getDay();
    const fri = new Date(now2); fri.setDate(now2.getDate() + (5 - cd)); fri.setHours(23,59,59,999);
    if (date <= fri) return false;
    const dNM = (7 - cd + 1) % 7; const dAdd = dNM === 0 ? 7 : dNM;
    const nMon = new Date(now2); nMon.setDate(now2.getDate() + dAdd); nMon.setHours(0,0,0,0);
    const nFri = new Date(nMon); nFri.setDate(nMon.getDate() + 4); nFri.setHours(23,59,59,999);
    return date < nMon || date > nFri;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const iso  = date.toISOString().split('T')[0];
    const fmt  = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const isSel = selectedDates.includes(fmt);
    const isNew = fmt === justSelected;
    const hasEv = events.some(e => { const ed = e.start instanceof Date ? e.start : new Date(e.start); return ed.toISOString().split('T')[0] === iso; });
    if (isSel && isNew) return 'tile-just-selected';
    if (isSel) return 'tile-selected';
    if (hasEv) return 'tile-has-event';
    return '';
  };

  const handleRequest = async () => {
    try {
      if (!sessionStorage.getItem('googleAccessToken')) return;
      if (selectedDates.length === 0) { alert("Por favor selecciona al menos un día entre lunes y viernes."); return; }
      const valid = selectedDates.map(ds => { const d = new Date(ds + 'T00:00:00'); if (d.getDay()===0||d.getDay()===6){alert("Solo días lunes a viernes.");return null;} return d; }).filter(Boolean);
      if (valid.length > 0) setShowTimeModal(true);
    } catch (error) { console.error('Error:', error); alert('Error al procesar tu solicitud.'); }
  };

  const handleConfirmTimeSlots = async (selectedTimeSlots, telefono) => {
    try {
      const jwtToken   = sessionStorage.getItem('jwtToken');
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      if (!jwtToken || !currentUser) { alert("No hay sesión activa."); return; }
      if (!gapi.client || !gapi.auth2) { alert("No se pudo conectar con Google Calendar."); return; }
      const creadas = [];
      for (const date of selectedDates) {
        const startTime = selectedTimeSlots[date]?.start;
        const endTime   = selectedTimeSlots[date]?.end;
        if (!startTime || !endTime) continue;
        const startDT = new Date(`${date}T${startTime}`);
        const endDT   = new Date(`${date}T${endTime}`);
        if (isNaN(startDT.getTime()) || isNaN(endDT.getTime())) continue;
        try {
          const ev = await createEvent({ summary: 'Solicitud de proyector', start: startDT, end: endDT });
          if (!ev?.id) continue;
          const res = await fetchFromAPI('/solicitar-proyector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
            body: JSON.stringify({ fechaInicio: startDT.toISOString(), fechaFin: endDT.toISOString(), motivo: 'Solicitud de proyector', eventId: ev.id, grado: currentUser?.grado||'', grupo: currentUser?.grupo||'', turno: currentUser?.turno||'', telefono })
          });
          const sol = res?.solicitud;
          if (sol?._id) creadas.push({ id: sol._id, fecha: date, horaInicio: startTime, horaFin: endTime });
        } catch (e) { console.error('Error en fecha', date, e); }
      }
      if (!creadas.length) { alertaError('No se pudo generar el código QR.'); return; }
      const solicitudId = creadas[0].id || creadas[0]._id;
      if (!solicitudId) { alertaError('Error en el formato de la solicitud.'); return; }
      const qrInfo = { solicitudId, usuarioId: currentUser._id || currentUser.id, fechas: creadas.map(s => ({ fecha: s.fecha, horaInicio: s.horaInicio, horaFin: s.horaFin })) };
      if (!qrInfo.solicitudId || !qrInfo.usuarioId) { alertaError('No se pudo generar el código QR.'); return; }
      setTimeout(() => { setQrData(JSON.stringify(qrInfo)); setShouldSaveQR(true); }, 100);
      setShowTimeModal(false);
      fetchEvents();
      alertaExito('Solicitudes procesadas correctamente');
    } catch (error) { console.error('Error:', error); alertaError('Hubo un error. Intenta de nuevo.'); }
  };

  const handleDeleteEvents = async (eventIds) => {
    try {
      let tok = sessionStorage.getItem('googleAccessToken') || sessionStorage.getItem('accessRequest') || localStorage.getItem('accessToken');
      if (!tok) {
        if (gapi?.auth2) {
          try { const a2=gapi.auth2.getAuthInstance(); await a2.signIn(); tok=a2.currentUser.get().getAuthResponse().access_token; sessionStorage.setItem('googleAccessToken',tok); }
          catch(e){ console.error('Error token:',e); alertaError('No se pudo renovar la sesión.'); return; }
        } else { alertaError('No hay sesión activa.'); return; }
      }
      for (const eventId of eventIds) {
        try { await gapi.client.calendar.events.delete({ calendarId:'primary', eventId }); }
        catch(error){
          console.error(`Error eliminando ${eventId}:`, error);
          if (error.status===401 && gapi?.auth2) {
            try { const a2=gapi.auth2.getAuthInstance(); await a2.signIn(); const nt=a2.currentUser.get().getAuthResponse().access_token; sessionStorage.setItem('googleAccessToken',nt); gapi.client.setToken({access_token:nt}); await gapi.client.calendar.events.delete({calendarId:'primary',eventId}); }
            catch(e){ console.error('Error renovando:',e); }
          }
        }
      }
      fetchEvents(); setShowModal(false); alertaExito('Eventos eliminados correctamente');
    } catch (error) { console.error('Error:', error); alertaError('Hubo un error al eliminar.'); }
  };

  const toggleEventSelection = (id) =>
    setEvents(prev => prev.map(e => e.id===id ? {...e, selected:!e.selected} : e));

  useEffect(() => { if (qrData && shouldSaveQR) saveQRToDatabase(qrData); }, [qrData, shouldSaveQR]);

  const saveQRToDatabase = async (data) => {
    try {
      const token = sessionStorage.getItem('jwtToken');
      if (!token) return;
      sessionStorage.setItem('lastGeneratedQR', data);
      const res = await fetchFromAPI('/qr-codes', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body: JSON.stringify({qrData:data}) });
      if (res.success) setShouldSaveQR(false);
    } catch (error) { console.error('Error guardando QR:', error); }
  };

  const qrUrl = qrData ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=300x300&margin=10` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen p-2 sm:p-4 md:p-8 bg-gray-50 dark:bg-gray-900"
    >
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── HERO HEADER ── */}
        <div className={`relative bg-gradient-to-br ${themeStyles.gradient} rounded-3xl overflow-hidden shadow-2xl`}>

          {/* Orbs flotantes */}
          {ORBS.map((o, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10 backdrop-blur-sm"
              style={{ width: o.w, height: o.h, left: o.left, top: o.top }}
              animate={{ y: [0, -18, 0], scale: [1, 1.08, 1], opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: o.delay }}
            />
          ))}

          <div className="relative z-10 flex flex-col items-center text-center px-6 py-10 sm:py-14">
            {/* Ícono animado */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-white/20 backdrop-blur-md border border-white/30 p-5 sm:p-6 rounded-2xl shadow-xl mb-5"
            >
              <FontAwesomeIcon icon={faTv} className="text-white h-10 w-10 sm:h-14 sm:w-14 drop-shadow-lg" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg tracking-tight"
            >
              Solicitud de Proyector
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-2 text-white/75 text-sm sm:text-base"
            >
              Selecciona los días que necesitas el proyector
            </motion.p>

            {/* Reloj vivo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 bg-black/20 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-4"
            >
              <div className="text-left">
                <p className="text-white/60 text-xs uppercase tracking-widest">Tapachula, Chiapas</p>
                <p className="text-white font-black text-2xl sm:text-3xl font-mono tabular-nums tracking-tight leading-none mt-0.5">
                  {timeStr}
                </p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{dayName}</p>
                <p className="text-white/70 text-xs">{now.day} {monthName} {now.year}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── CARD PRINCIPAL ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">

          {/* Leyenda */}
          <div className="px-6 pt-5 pb-2 flex flex-wrap gap-4">
            {[
              { color: 'bg-indigo-500', label: 'Fecha seleccionada', glow: 'shadow-indigo-200' },
              { color: 'bg-red-500',    label: 'Solicitud existente', glow: 'shadow-red-200' },
              { color: 'bg-gray-300 dark:bg-gray-600', label: 'No disponible', glow: '' },
            ].map(({ color, label, glow }) => (
              <span key={label} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className={`w-3 h-3 rounded-full ${color} shadow-md ${glow}`} />
                {label}
              </span>
            ))}
          </div>

          {/* Calendario */}
          <div className="px-3 sm:px-6 pb-4">
            <div className="calendar-wrapper rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-inner">
              <Calendar
                onChange={handleDateChange}
                value={null}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                locale="es-ES"
              />
            </div>
          </div>

          {/* Fechas seleccionadas */}
          <AnimatePresence>
            {selectedDates.length > 0 && (
              <motion.div
                key="dates-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-4 sm:mx-6 mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/50 p-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-indigo-500 text-sm" />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    {selectedDates.length} {selectedDates.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {selectedDates.map((date, i) => (
                      <motion.div
                        key={date}
                        initial={{ scale: 0, opacity: 0, y: 12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0, x: -10 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 22, delay: i * 0.04 }}
                        className="date-pill flex items-center gap-2 pl-3 pr-2 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
                      >
                        <span>{date}</span>
                        <motion.button
                          whileHover={{ scale: 1.2, rotate: 90 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleDateChange(new Date(date))}
                          className="w-5 h-5 rounded-full bg-white/25 hover:bg-white/45 flex items-center justify-center transition-colors text-xs leading-none"
                          aria-label="Quitar fecha"
                        >
                          ×
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botones */}
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(99,102,241,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRequest}
              className={`btn-shimmer flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 font-bold text-sm
                         bg-gradient-to-r ${themeStyles.gradient} text-white rounded-2xl
                         shadow-lg transition-all duration-200`}
            >
              <FontAwesomeIcon icon={faCalendarPlus} className="text-base" />
              Solicitar Proyector
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(239,68,68,0.25)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowModal(true)}
              className="btn-shimmer-red flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 font-bold text-sm
                         bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl
                         shadow-lg transition-all duration-200"
            >
              <FontAwesomeIcon icon={faTrash} className="text-base" />
              Eliminar Eventos
            </motion.button>
          </div>
        </div>

        {/* ── SECCIÓN QR ── */}
        <AnimatePresence>
          {qrData && (
            <motion.div
              key="qr-section"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-indigo-100 dark:border-indigo-800/50"
            >
              {/* Fondo degradado sutil */}
              <div className={`absolute inset-0 bg-gradient-to-br ${themeStyles.gradient} opacity-5`} />

              {/* Header */}
              <div className={`relative bg-gradient-to-r ${themeStyles.gradient} px-6 py-4 flex items-center gap-3`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FontAwesomeIcon icon={faQrcode} className="text-white text-xl" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-white text-base">Código QR generado</h3>
                  <p className="text-white/70 text-xs">Tu solicitud fue registrada exitosamente</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="ml-auto w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                />
              </div>

              <div className="relative p-6 flex flex-col items-center gap-5">
                {/* QR con efecto scan */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
                  className="relative qr-glow rounded-2xl overflow-hidden"
                >
                  <div className={`p-4 bg-gradient-to-br ${themeStyles.gradient} rounded-2xl`}>
                    <div className="bg-white rounded-xl p-2 shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=200x200&margin=6`}
                        alt="QR Code"
                        className="w-[200px] h-[200px] rounded-lg"
                      />
                    </div>
                  </div>
                  {/* Línea de escaneo animada */}
                  <div className="scan-line absolute left-4 right-4" />
                </motion.div>

                {/* Info */}
                <div className="text-center">
                  <p className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/60 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                    ID: {JSON.parse(qrData || '{"solicitudId":"no-id"}').solicitudId}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-xs">
                    Muestra este código al administrador para la asignación del proyector
                  </p>
                </div>

                {/* Botones QR */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    href={qrUrl}
                    download="mi-qr-proyector.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-shimmer flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm
                               bg-gradient-to-r ${themeStyles.gradient} text-white rounded-xl shadow-md`}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Descargar QR
                  </motion.a>

                  {navigator.share && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        navigator.share({ title: 'Mi QR de solicitud de proyector', text: 'Código QR para solicitud de proyector', url: qrUrl })
                          .catch(err => console.error('Error al compartir:', err));
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm
                                 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600
                                 text-white rounded-xl shadow-md transition-all"
                    >
                      <FontAwesomeIcon icon={faShareNodes} />
                      Compartir
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modales */}
        <DeleteEventModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          handleDelete={handleDeleteEvents}
          events={events}
          toggleEventSelection={toggleEventSelection}
          themeStyles={themeStyles}
        />
        <TimeSelectionModal
          show={showTimeModal}
          handleClose={() => setShowTimeModal(false)}
          selectedDates={selectedDates}
          handleConfirm={handleConfirmTimeSlots}
          themeStyles={themeStyles}
        />
      </div>
    </motion.div>
  );
};

export default RequestProjector;
