import { motion, useAnimation, type PanInfo } from 'framer-motion';
import { useState } from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  status?: 'done' | 'miss';
  onSwipe: (status: 'done' | 'miss') => void;
}

const SWIPE_THRESHOLD = 100;

export function QuestCard({ task, status, onSwipe }: Props) {
  const controls = useAnimation();
  const [dragDirection, setDragDirection] = useState<'done' | 'miss' | null>(null);

  function handleDrag(_: unknown, info: PanInfo) {
    if (info.offset.x > 20) setDragDirection('done');
    else if (info.offset.x < -20) setDragDirection('miss');
    else setDragDirection(null);
  }

  async function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe('done');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe('miss');
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
      setDragDirection(null);
    }
  }

  const resolved = status === 'done' || status === 'miss';

  return (
    <motion.div
      className="relative select-none rounded-2xl border border-panel-border bg-panel p-4"
      drag={resolved ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      animate={controls}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {dragDirection === 'done' && (
        <span className="absolute right-4 top-4 rounded border-2 border-done px-2 py-0.5 text-xs font-bold text-done">
          DONE ✅
        </span>
      )}
      {dragDirection === 'miss' && (
        <span className="absolute left-4 top-4 rounded border-2 border-miss px-2 py-0.5 text-xs font-bold text-miss">
          MISS ❌
        </span>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">
            {task.icon} {task.name}
          </div>
          <div className="text-xs text-neutral-400">{task.category}</div>
        </div>
        <div className="glow-text font-bold text-neon">+{task.xpReward} XP</div>
      </div>

      {status && (
        <div
          className={`mt-3 text-center text-sm font-bold ${
            status === 'done' ? 'text-done' : 'text-miss'
          }`}
        >
          {status === 'done' ? 'DONE ✅' : 'MISS ❌'}
        </div>
      )}
      {!resolved && (
        <div className="mt-3 text-center text-[11px] text-neutral-500">
          ← swipe miss &nbsp;|&nbsp; swipe done →
        </div>
      )}
    </motion.div>
  );
}
