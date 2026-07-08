import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { useGameStore } from '../store/useGameStore';

export function ProfileSelect() {
  const users = useGameStore((s) => s.users);
  const selectPlayer = useGameStore((s) => s.selectPlayer);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6">
      <div>
        <h1 className="glow-text text-center text-3xl font-black text-neon">QUEST DUO</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">Choose your character</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => {
              selectPlayer(user.id);
              navigate('/');
            }}
            className="glow flex items-center gap-4 rounded-2xl border border-panel-border bg-panel p-4 text-left transition active:scale-95"
          >
            <Avatar avatar={user.avatar} size={64} />
            <div>
              <div className="text-xl font-bold">{user.username}</div>
              <div className="text-xs text-neutral-400">Level {user.level}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
