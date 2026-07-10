import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { HeatCell } from '../lib/stats';

// Neon-orange intensity scale on the dark theme.
const CELL_BG: Record<HeatCell['intensity'], string> = {
  0: '#1c1c1c',
  1: '#5a3312',
  2: '#9a5214',
  3: '#d46b16',
  4: '#ff7a1a',
};

interface Props {
  cells: HeatCell[];
  onSelect?: (cell: HeatCell | null) => void;
  selectedDay?: string;
}

export function Heatmap({ cells, onSelect, selectedDay }: Props) {
  const firstWeekday = cells.length ? new Date(cells[0].day).getUTCDay() : 0;
  const pad = Array.from({ length: firstWeekday });

  const handleSelect = useCallback(
    (cell: HeatCell) => {
      if (cell.day === selectedDay) {
        onSelect?.(null); // Deselect if tapping same cell
      } else {
        onSelect?.(cell);
      }
    },
    [onSelect, selectedDay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cell: HeatCell) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(cell);
      }
    },
    [handleSelect],
  );

  return (
    <div className="overflow-x-auto pb-1" role="grid" aria-label="Habit completion heatmap">
      <div
        className="grid w-max gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}
      >
        {pad.map((_, i) => (
          <div key={`pad-${i}`} className="h-[11px] w-[11px]" aria-hidden="true" />
        ))}
        {cells.map((cell, i) => {
          const perfect = cell.intensity === 4;
          const selected = cell.day === selectedDay;
          const label = `${cell.day}: ${cell.done} done, ${cell.miss} missed, ${cell.xp} XP`;
          return (
            <motion.button
              key={cell.day}
              type="button"
              onClick={() => handleSelect(cell)}
              onKeyDown={(e) => handleKeyDown(e, cell)}
              title={label}
              aria-label={label}
              aria-pressed={selected}
              tabIndex={0}
              className="h-[11px] w-[11px] rounded-[2px] focus:outline-none focus-visible:ring-1 focus-visible:ring-neon"
              style={{
                backgroundColor: CELL_BG[cell.intensity],
                boxShadow: perfect ? '0 0 5px #ff7a1a' : undefined,
                outline: selected ? '1.5px solid #fff' : undefined,
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.0016, 0.6) }}
              whileHover={{ scale: 1.35 }}
              whileTap={{ scale: 0.9 }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="h-[10px] w-[10px] rounded-[2px]"
          style={{ backgroundColor: CELL_BG[n as HeatCell['intensity']] }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

// A per-quest card with its own heatmap, streak, and completion count.
export function HabitHeatmapCard({
  icon,
  name,
  description,
  streak,
  completionCount,
  cells,
}: {
  icon: string;
  name: string;
  description: string;
  streak: number;
  completionCount: number;
  cells: HeatCell[];
}) {
  const [selected, setSelected] = useState<HeatCell | null>(null);

  return (
    <div className="glow rounded-2xl border border-panel-border bg-panel p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-bold">
            {icon} {name}
          </div>
          <div className="truncate text-xs text-neutral-500">{description}</div>
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="font-bold text-neon">🔥 {streak}</div>
          <div className="text-neutral-500">{completionCount}×</div>
        </div>
      </div>

      <div className="mt-3">
        <Heatmap cells={cells} onSelect={setSelected} selectedDay={selected?.day} />
        <HeatmapLegend />
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg border border-panel-border bg-black/40 p-2 text-xs"
        >
          <span className="font-semibold text-neutral-200">
            {new Date(selected.day).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </span>
          {selected.done > 0 ? (
            <span className="text-neutral-400">
              {' '}· ✅ {selected.done} done · {selected.xp} XP
            </span>
          ) : selected.miss > 0 ? (
            <span className="text-miss"> · ❌ missed</span>
          ) : (
            <span className="text-neutral-600"> · no activity</span>
          )}
        </motion.div>
      )}
    </div>
  );
}
