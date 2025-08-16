import { useEffect, useCallback } from "react";

const useInactivityTimer = (onTimeout, timeout = 10 * 60 * 1000) => {
  useEffect(() => {
    let logoutTimer;

    const resetTimer = () => {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(onTimeout, timeout);
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart", "touchmove"];
    activityEvents.forEach(event =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      clearTimeout(logoutTimer);
      activityEvents.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [onTimeout, timeout]);
};

export default useInactivityTimer;
