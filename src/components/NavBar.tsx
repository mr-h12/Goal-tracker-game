import { NavLink } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

const LINKS = [
  { to: '/', label: 'Home', icon: '🏰' },
  { to: '/character', label: 'Hero', icon: '🧙' },
  { to: '/quests', label: 'Quests', icon: '📜' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/leaderboard', label: 'Ranks', icon: '🏆' },
  { to: '/manage', label: 'Manage', icon: '⚙️' },
];

export function NavBar() {
  const signOut = useGameStore((s) => s.signOut);

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-panel-border bg-panel/95 backdrop-blur">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? 'glow-text text-neon' : 'text-neutral-500'
            }`
          }
        >
          <span className="text-lg">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
      <button
        onClick={() => void signOut()}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-neutral-500"
      >
        <span className="text-lg">🚪</span>
        Logout
      </button>
    </nav>
  );
}
