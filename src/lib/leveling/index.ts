// XP required is defined per-level; totalXpForLevel is cumulative from level 1.
// Configure here to retune the curve without touching UI code.
const XP_STEP = 100;

export function xpRequiredForLevel(level: number): number {
  return (level - 1) * XP_STEP;
}

export function levelFromXp(totalXp: number): number {
  return Math.floor(totalXp / XP_STEP) + 1;
}

export function xpProgress(totalXp: number) {
  const level = levelFromXp(totalXp);
  const currentLevelFloor = xpRequiredForLevel(level);
  const nextLevelCeiling = xpRequiredForLevel(level + 1);
  return {
    level,
    currentXp: totalXp - currentLevelFloor,
    xpToNext: nextLevelCeiling - currentLevelFloor,
    percent: Math.min(
      100,
      ((totalXp - currentLevelFloor) / (nextLevelCeiling - currentLevelFloor)) * 100,
    ),
  };
}

export function titleForLevel(level: number): string {
  if (level >= 20) return 'Legend';
  if (level >= 15) return 'Champion';
  if (level >= 10) return 'Veteran';
  if (level >= 5) return 'Adventurer';
  return 'Novice';
}
