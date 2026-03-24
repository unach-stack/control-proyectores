import { Temporal } from '@js-temporal/polyfill';
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTv, faCalendarPlus, faTrash, faClock, faQrcode, faDownload, faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { gapi } from 'gapi-script';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './RequestProjector.css';
import TimeSelectionModal from './TimeSelectionModal';
import DeleteEventModal from './DeleteEventModal';
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

const RequestProjector = () => {
  const { targetTimeZone } = useTimeZone();
  useAuth();
  const [selectedDates, setSelectedDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [shouldSaveQR, setShouldSaveQR] = useState(false);

  const { currentTheme } = useTheme();
  const themeStyles = getCurrentThemeStyles(currentTheme);

  const dateToTemporal = (date) => {
    if (!date) return null;
    const instant = Temporal.Instant.fromEpochMilliseconds(date.getTime());
    return instant.toZonedDateTimeISO(targetTimeZone);
  };

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

        await new Promise((resolve) => {
          gapi.load('client:auth2', resolve);
        });

        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES
        });

        const auth2 = gapi.auth2.getAuthInstance();
        const currentUser = auth2.currentUser.get();
        let accessToken = currentUser.getAuthResponse().access_token;

        if (accessToken !== sessionStorage.getItem('accessRequest')) {
          accessToken = sessionStorage.getItem('accessRequest');
        }

        gapi.client.setToken({ access_token: accessToken });
        await fetchEvents();
      } catch (error) {
        console.error('Error al cargar GAPI:', error);
      }
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
        singleEvents: true,
        orderBy: 'startTime',
        q: 'Solicitud de proyector'
      });

      const fetchedEvents = response.result.items.map(event => {
        const startInstant = Temporal.Instant.from(event.start.dateTime || event.start.date);
        const endInstant = Temporal.Instant.from(event.end.dateTime || event.end.date);
        return {
          id: event.id,
          summary: event.summary,
          start: new Date(startInstant.epochMilliseconds),
          end: new Date(endInstant.epochMilliseconds),
          selected: false
        };
      });

      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      if (error.status === 401) {
        try {
          const auth2 = gapi.auth2.getAuthInstance();
          await auth2.signIn();
          const currentUser = auth2.currentUser.get();
          const newToken = currentUser.getAuthResponse().access_token;
          sessionStorage.setItem('accessRequest', newToken);
          gapi.client.setToken({ access_token: newToken });
          await fetchEvents();
        } catch (signInError) {
          console.error('Error al renovar la sesión:', signInError);
        }
      }
    }
  };

  const createEvent = async (event) => {
    try {
      const auth2 = gapi.auth2.getAuthInstance();
      if (!auth2) throw new Error('No se pudo obtener la instancia de auth2');

      if (!auth2.isSignedIn.get()) await auth2.signIn();

      const currentUser = auth2.currentUser.get();
      const accessToken = currentUser.getAuthResponse().access_token;
      gapi.client.setToken({ access_token: accessToken });

      if (!(event.start instanceof Date) || isNaN(event.start.getTime()))
        throw new Error('La fecha de inicio no es válida');
      if (!(event.end instanceof Date) || isNaN(event.end.getTime()))
        throw new Error('La fecha de fin no es válida');

      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: event.summary,
          start: { dateTime: event.start.toISOString(), timeZone: targetTimeZone },
          end: { dateTime: event.end.toISOString(), timeZone: targetTimeZone }
        }
      });

      return response.result;
    } catch (error) {
      console.error('Error al crear evento:', error);
      throw error;
    }
  };

  const handleDateChange = (newDate) => {
    if (newDate && newDate instanceof Date && !isNaN(newDate)) {
      const temporalDate = dateToTemporal(newDate).toPlainDate();
      const dateStr = temporalDate.toString();
      const isDateSelected = selectedDates.includes(dateStr);
      if (isDateSelected) {
        setSelectedDates(selectedDates.filter(d => d !== dateStr));
      } else {
        setSelectedDates([...selectedDates, dateStr].sort());
      }
    }
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== 'month') return false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    if (date < now) return true;

    const currentDay = now.getDay();
    const daysUntilFridayThisWeek = 5 - currentDay;
    const fridayThisWeek = new Date(now);
    fridayThisWeek.setDate(now.getDate() + daysUntilFridayThisWeek);
    fridayThisWeek.setHours(23, 59, 59, 999);

    if (date <= fridayThisWeek) return false;

    const daysUntilNextMonday = (7 - currentDay + 1) % 7;
    const daysToAdd = daysUntilNextMonday === 0 ? 7 : daysUntilNextMonday;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysToAdd);
    nextMonday.setHours(0, 0, 0, 0);

    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    nextFriday.setHours(23, 59, 59, 999);

    return date < nextMonday || date > nextFriday;
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const dateStr = date.toISOString().split('T')[0];
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isSelected = selectedDates.includes(formattedDate);
    const hasEvent = events.some(event => {
      const eventDate = event.start instanceof Date ? event.start : new Date(event.start);
      return eventDate.toISOString().split('T')[0] === dateStr;
    });

    if (isSelected) return 'bg-indigo-600 text-white hover:bg-indigo-700';
    if (hasEvent) return 'bg-red-600 text-white hover:bg-red-700';
    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
  };

  const handleRequest = async () => {
    try {
      const googleCredential = sessionStorage.getItem('googleAccessToken');
      if (!googleCredential) return;

      if (selectedDates.length === 0) {
        alert("Por favor selecciona al menos un día entre lunes y viernes.");
        return;
      }

      const validDates = selectedDates.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        if (day === 0 || day === 6) {
          alert("Por favor selecciona solo días de lunes a viernes.");
          return null;
        }
        return date;
      }).filter(date => date !== null);

      if (validDates.length > 0) setShowTimeModal(true);
    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      alert('Hubo un error al procesar tu solicitud. Revisa la consola para más detalles.');
    }
  };

  const handleConfirmTimeSlots = async (selectedTimeSlots, telefono) => {
    try {
      const jwtToken = sessionStorage.getItem('jwtToken');
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

      if (!jwtToken || !currentUser) {
        alert("No hay sesión activa. Por favor, inicia sesión nuevamente.");
        return;
      }

      if (!gapi.client || !gapi.auth2) {
        alert("No se pudo conectar con Google Calendar. Por favor, recarga la página.");
        return;
      }

      const solicitudesCreadas = [];

      for (const date of selectedDates) {
        const startTime = selectedTimeSlots[date]?.start;
        const endTime = selectedTimeSlots[date]?.end;

        if (!startTime || !endTime) continue;

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) continue;

        try {
          const createdEvent = await createEvent({
            summary: 'Solicitud de proyector',
            start: startDateTime,
            end: endDateTime
          });

          if (!createdEvent?.id) continue;

          const response = await fetchFromAPI('/solicitar-proyector', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
              fechaInicio: startDateTime.toISOString(),
              fechaFin: endDateTime.toISOString(),
              motivo: 'Solicitud de proyector',
              eventId: createdEvent.id,
              grado: currentUser?.grado || '',
              grupo: currentUser?.grupo || '',
              turno: currentUser?.turno || '',
              telefono
            })
          });

          const solicitudData = response?.solicitud;
          if (solicitudData?._id) {
            solicitudesCreadas.push({
              id: solicitudData._id,
              fecha: date,
              horaInicio: startTime,
              horaFin: endTime
            });
          }
        } catch (error) {
          console.error('Error al procesar solicitud para la fecha', date, error);
        }
      }

      if (!solicitudesCreadas.length) {
        alertaError('No se pudo generar el código QR. Intenta nuevamente.');
        return;
      }

      const solicitudId = solicitudesCreadas[0].id || solicitudesCreadas[0]._id;
      if (!solicitudId) {
        alertaError('Error en el formato de la solicitud. Intenta nuevamente.');
        return;
      }

      const qrInfo = {
        solicitudId,
        usuarioId: currentUser._id || currentUser.id,
        fechas: solicitudesCreadas.map(s => ({
          fecha: s.fecha,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin
        }))
      };

      if (!qrInfo.solicitudId || !qrInfo.usuarioId) {
        alertaError('No se pudo generar el código QR con los datos recibidos.');
        return;
      }

      const qrString = JSON.stringify(qrInfo);
      setTimeout(() => {
        setQrData(qrString);
        setShouldSaveQR(true);
      }, 100);

      setShowTimeModal(false);
      fetchEvents();
      alertaExito('Solicitudes procesadas correctamente');
    } catch (error) {
      console.error('Error al procesar las solicitudes:', error);
      alertaError('Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteEvents = async (eventIds) => {
    try {
      let accessToken = sessionStorage.getItem('googleAccessToken') ||
        sessionStorage.getItem('accessRequest') ||
        localStorage.getItem('accessToken');

      if (!accessToken) {
        if (gapi?.auth2) {
          try {
            const auth2 = gapi.auth2.getAuthInstance();
            await auth2.signIn();
            const currentUser = auth2.currentUser.get();
            accessToken = currentUser.getAuthResponse().access_token;
            sessionStorage.setItem('googleAccessToken', accessToken);
          } catch (signInError) {
            console.error('Error al renovar el token:', signInError);
            alertaError('No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.');
            return;
          }
        } else {
          alertaError('No hay sesión activa. Por favor, inicia sesión nuevamente.');
          return;
        }
      }

      for (const eventId of eventIds) {
        try {
          await gapi.client.calendar.events.delete({ calendarId: 'primary', eventId });
        } catch (error) {
          console.error(`Error al eliminar el evento ${eventId}:`, error);
          if (error.status === 401 && gapi?.auth2) {
            try {
              const auth2 = gapi.auth2.getAuthInstance();
              await auth2.signIn();
              const currentUser = auth2.currentUser.get();
              const newToken = currentUser.getAuthResponse().access_token;
              sessionStorage.setItem('googleAccessToken', newToken);
              gapi.client.setToken({ access_token: newToken });
              await gapi.client.calendar.events.delete({ calendarId: 'primary', eventId });
            } catch (signInError) {
              console.error('Error al renovar la sesión:', signInError);
            }
          }
        }
      }

      fetchEvents();
      setShowModal(false);
      alertaExito('Eventos eliminados correctamente');
    } catch (error) {
      console.error('Error general al eliminar eventos:', error);
      alertaError('Hubo un error al eliminar los eventos. Por favor, intenta de nuevo.');
    }
  };

  const toggleEventSelection = (id) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === id ? { ...event, selected: !event.selected } : event
      )
    );
  };

  useEffect(() => {
    if (qrData && shouldSaveQR) saveQRToDatabase(qrData);
  }, [qrData, shouldSaveQR]);

  const saveQRToDatabase = async (data) => {
    try {
      const token = sessionStorage.getItem('jwtToken');
      if (!token) return;

      sessionStorage.setItem('lastGeneratedQR', data);

      const response = await fetchFromAPI('/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrData: data })
      });

      if (response.success) setShouldSaveQR(false);
    } catch (error) {
      console.error('Error al guardar el QR:', error);
    }
  };

  const now = Temporal.Now.zonedDateTimeISO(targetTimeZone);
  const qrUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=300x300&margin=10`
    : null;

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto">

        {/* Tarjeta principal */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">

          {/* Header con gradiente */}
          <div className={`bg-gradient-to-r ${themeStyles.gradient} p-6 sm:p-8`}>
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 backdrop-blur-sm p-4 sm:p-5 rounded-2xl mb-4 shadow-inner">
                <FontAwesomeIcon
                  icon={faTv}
                  className="text-white h-8 w-8 sm:h-12 sm:w-12 md:h-14 md:w-14"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow">
                Solicitud de Proyector
              </h2>
              <p className="text-white/80 text-sm sm:text-base">
                Selecciona las fechas en las que necesitas el proyector
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8 space-y-6">

            {/* Reloj de zona horaria */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className={`bg-gradient-to-br ${themeStyles.gradient} p-3 rounded-xl shadow`}>
                <FontAwesomeIcon icon={faClock} className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Zona horaria — Ciudad de Tapachula, Chiapas
                </p>
                <p className="text-xl font-mono font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                  {now.toPlainTime().toString().split('.')[0]}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {now.toPlainDate().toString()}
                </p>
              </div>
            </div>

            {/* Leyenda del calendario */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                Fecha seleccionada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                Solicitud existente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 inline-block" />
                No disponible
              </span>
            </div>

            {/* Calendario */}
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-600 p-2 sm:p-4 shadow-sm">
              <Calendar
                onChange={handleDateChange}
                value={null}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                locale="es-ES"
              />
            </div>

            {/* Fechas seleccionadas */}
            {selectedDates.length > 0 && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 uppercase tracking-wide">
                  Fechas seleccionadas — {selectedDates.length}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map(date => (
                    <div
                      key={date}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-sm shadow-sm"
                    >
                      <span>{date}</span>
                      <button
                        onClick={() => handleDateChange(new Date(date))}
                        className="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors leading-none"
                        aria-label="Quitar fecha"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRequest}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold
                           bg-gradient-to-r ${themeStyles.gradient} text-white rounded-xl
                           ${themeStyles.hover} focus:ring-4 focus:ring-opacity-40 ${themeStyles.border}
                           shadow-md hover:shadow-lg transition-all duration-200`}
              >
                <FontAwesomeIcon icon={faCalendarPlus} />
                Solicitar Proyector
              </button>

              <button
                onClick={() => setShowModal(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold
                           bg-gradient-to-r ${themeStyles.deleteGradient || 'from-red-500 to-red-700'} text-white rounded-xl
                           ${themeStyles.deleteHover || 'hover:from-red-600 hover:to-red-800'}
                           focus:ring-4 focus:ring-opacity-40 ${themeStyles.deleteBorder || 'focus:ring-red-300 dark:focus:ring-red-700'}
                           shadow-md hover:shadow-lg transition-all duration-200`}
              >
                <FontAwesomeIcon icon={faTrash} />
                Eliminar Eventos
              </button>
            </div>

            {/* Sección QR */}
            {qrData && (
              <div className="mt-2 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden">
                <div className={`bg-gradient-to-r ${themeStyles.gradient} px-5 py-3 flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faQrcode} className="text-white" />
                  <h3 className="font-semibold text-white text-sm">
                    Código QR de tu solicitud
                  </h3>
                </div>

                <div className="p-5 flex flex-col items-center gap-4">
                  <div className={`p-3 ${themeStyles.background} rounded-xl shadow-md`}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=200x200&margin=10`}
                      alt="QR Code"
                      className="w-[200px] h-[200px] rounded-lg"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      ID: {JSON.parse(qrData || '{"solicitudId":"no-id"}').solicitudId}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Muestra este código al administrador para agilizar la asignación
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <a
                      href={qrUrl}
                      download="mi-qr-proyector.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 px-5 py-2.5 font-medium
                                 bg-gradient-to-r ${themeStyles.gradient} text-white rounded-xl
                                 ${themeStyles.hover} shadow transition-all duration-200 text-sm`}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      Descargar QR
                    </a>

                    {navigator.share && (
                      <button
                        onClick={() => {
                          navigator.share({
                            title: 'Mi código QR de solicitud de proyector',
                            text: 'Aquí está mi código QR para la solicitud de proyector',
                            url: qrUrl
                          }).catch(err => console.error('Error al compartir:', err));
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 font-medium
                                   bg-green-600 hover:bg-green-700 text-white rounded-xl
                                   shadow transition-all duration-200 text-sm"
                      >
                        <FontAwesomeIcon icon={faShareNodes} />
                        Compartir QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modales */}
        <DeleteEventModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          handleDelete={handleDeleteEvents}
          events={events}
          toggleEventSelection={toggleEventSelection}
          className="max-w-lg mx-auto"
          themeStyles={themeStyles}
        />

        <TimeSelectionModal
          show={showTimeModal}
          handleClose={() => setShowTimeModal(false)}
          selectedDates={selectedDates}
          handleConfirm={handleConfirmTimeSlots}
          className="max-w-lg mx-auto"
          themeStyles={themeStyles}
        />
      </div>
    </div>
  );
};

export default RequestProjector;
