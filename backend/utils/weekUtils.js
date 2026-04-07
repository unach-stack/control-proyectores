/**
 * Returns the ISO week string for a given date (default: now).
 * Format: "YYYY-Www" e.g. "2026-W13"
 */
function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Returns the Monday (UTC) of the given ISO week string.
 */
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

/**
 * Returns the Friday (UTC) of the given ISO week string.
 */
function getFridayOfWeek(semana) {
  const monday = getMondayOfWeek(semana);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return friday;
}

/**
 * Returns the ISO week string for the week before the given one.
 */
function getPrevISOWeek(semana) {
  const monday = getMondayOfWeek(semana);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return getISOWeek(monday);
}

/**
 * Returns the ISO week string for the week after the given one.
 */
function getNextISOWeek(semana) {
  const monday = getMondayOfWeek(semana);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return getISOWeek(monday);
}

module.exports = { getISOWeek, getMondayOfWeek, getFridayOfWeek, getPrevISOWeek, getNextISOWeek };
