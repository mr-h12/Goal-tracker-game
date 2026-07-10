import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { LevelUpModal } from './components/LevelUpModal';
import { useGameStore } from './store/useGameStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Character } from './pages/Character';
import { Quests } from './pages/Quests';
import { Leaderboard } from './pages/Leaderboard';
import { Manage } from './pages/Manage';
import { Stats } from './pages/Stats';

function App() {
  const init = useGameStore((s) => s.init);
  const loading = useGameStore((s) => s.loading);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-bg text-neon">
        Loading quests…
      </div>
    );
  }

  if (!currentPlayer) {
    return <Login />;
  }

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/character" element={<Character />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <NavBar />
      <LevelUpModal />
    </div>
  );
}

export default App;
