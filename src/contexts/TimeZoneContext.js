import React, { createContext, useContext, useState, useEffect } from 'react';
import { Temporal } from '@js-temporal/polyfill';

const TimeZoneContext = createContext();

export const useTimeZone = () => useContext(TimeZoneContext);

export const TimeZoneProvider = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(Temporal.Now.zonedDateTimeISO('America/Mexico_City'));
  const targetTimeZone = 'America/Mexico_City';

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Temporal.Now.zonedDateTimeISO(targetTimeZone));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <TimeZoneContext.Provider value={{ currentTime, targetTimeZone }}>
      {children}
    </TimeZoneContext.Provider>
  );
};