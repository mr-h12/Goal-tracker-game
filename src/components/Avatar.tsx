const AVATAR_EMOJI: Record<string, string> = {
  wolf: '🐺',
  whale: '🐋',
};

export function Avatar({ avatar, size = 56 }: { avatar: string; size?: number }) {
  return (
    <div
      className="glow flex items-center justify-center rounded-full border-2 border-neon bg-panel"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {AVATAR_EMOJI[avatar] ?? '❓'}
    </div>
  );
}
