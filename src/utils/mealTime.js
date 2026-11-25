// Converts between the stored meal timing text ("7:30 AM - 9:00 AM")
// and the 24-hour values used by <input type="time"> ("07:30", "09:00").

function to24h(text) {
  const match = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(text || '');
  if (!match) return '';
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  if (hours > 23 || Number(minutes) > 59) return '';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function to12h(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return '';
  const hours = Number(match[1]);
  const period = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${match[2]} ${period}`;
}

export function parseTimeRange(text) {
  const [start = '', end = ''] = String(text || '').split(/\s*[-–]\s*/);
  return { start: to24h(start), end: to24h(end) };
}

export function formatTimeRange(start, end) {
  return [to12h(start), to12h(end)].filter(Boolean).join(' - ');
}
