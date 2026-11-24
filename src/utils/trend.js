// Last 7 days built from REAL complaints.
// "Resolved" counts resolved tickets by the day of their last update.
export function buildWeeklyTrend(complaints) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const DAY = 86400000;
  return Array.from({ length: 7 }, (_, i) => {
    const start = today - (6 - i) * DAY;
    const inDay = (iso) => iso && new Date(iso).getTime() >= start && new Date(iso).getTime() < start + DAY;
    return {
      day: new Date(start).toLocaleDateString('en-IN', { weekday: 'short' }),
      submitted: complaints.filter((c) => inDay(c.createdAt)).length,
      resolved: complaints.filter((c) => c.status === 'Resolved' && inDay(c.updatedAt)).length,
    };
  });
}
