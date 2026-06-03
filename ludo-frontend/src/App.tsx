import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { GameRoom } from './pages/GameRoom';
import { OnlineGameRoom } from './pages/OnlineGameRoom';
import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Dashboard lobby */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Public login/register */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Game play area - accessible publicly for offline/local play */}
        <Route path="/game" element={<GameRoom />} />
        <Route path="/local-setup" element={<GameRoom />} />

        {/* Protected Online Game Room */}
        <Route
          path="/game/online/:roomCode"
          element={
            <ProtectedRoute>
              <OnlineGameRoom />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
