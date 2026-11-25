// Stacked bars: consumed (green) + reused leftover (amber) + wasted (red) = prepared.
const COLORS = {
  consumed: 'bg-emerald-500',
  reused: 'bg-amber-400',
  wasted: 'bg-rose-500',
};

export default function FoodStackedBars({ series }) {
  if (!series.length) return null;

  const max = Math.max(...series.map((s) => s.preparedKg), 1);
  // Show at most ~12 labels so they stay readable.
  const labelEvery = Math.ceil(series.length / 12);

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-mu">
        <Legend color={COLORS.consumed} label="Consumed" />
        <Legend color={COLORS.reused} label="Leftover reused / donated" />
        <Legend color={COLORS.wasted} label="Wasted" />
      </div>

      <div className="mt-4 flex h-52 items-end gap-[3px] overflow-x-auto pb-1">
        {series.map((s) => {
          const reused = Math.max(0, s.leftoverKg - s.wastedKg);
          return (
            <div
              key={s.key}
              title={`${s.label}\nPrepared ${s.preparedKg} kg\nConsumed ${s.consumedKg} kg\nWasted ${s.wastedKg} kg (${s.wastePct}%)\nMeals served ${s.servedMeals}`}
              className="flex h-full min-w-[10px] flex-1 flex-col justify-end"
            >
              <div className="flex flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(s.preparedKg / max) * 100}%` }}>
                <i className={COLORS.consumed} style={{ height: `${(s.consumedKg / s.preparedKg) * 100 || 0}%` }} />
                <i className={COLORS.reused} style={{ height: `${(reused / s.preparedKg) * 100 || 0}%` }} />
                <i className={COLORS.wasted} style={{ height: `${(s.wastedKg / s.preparedKg) * 100 || 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex gap-[3px] overflow-hidden">
        {series.map((s, i) => (
          <span key={s.key} className="min-w-[10px] flex-1 truncate text-center text-[10px] text-mu">
            {i % labelEvery === 0 ? s.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
