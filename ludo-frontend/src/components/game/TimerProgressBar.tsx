import React, { useEffect, useRef, useState } from 'react';
import type { GameStatus } from '../../engine/types';

interface TimerProgressBarProps {
  status: GameStatus;
  sequenceNumber: number;
  turnTimerSeconds: number;
  playerColorTheme: { dot: string; text: string };
}

export const TimerProgressBar: React.FC<TimerProgressBarProps> = ({
  status,
  sequenceNumber,
  turnTimerSeconds,
  playerColorTheme,
}) => {
  const [turnTime, setTurnTime] = useState(turnTimerSeconds);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any active interval to prevent stacking
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (status !== 'ACTIVE') return;

    // Reset countdown on turn sequence transition
    setTurnTime(turnTimerSeconds);

    timerIntervalRef.current = setInterval(() => {
      setTurnTime((p) => (p <= 1 ? 0 : p - 1));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status, sequenceNumber, turnTimerSeconds]);

  const percentage = (turnTime / turnTimerSeconds) * 100;
  const isUrgent = turnTime <= 4;

  return (
    <div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: 3,
          width: `${percentage}%`,
          background: isUrgent
            ? 'linear-gradient(90deg, #ef4444, #f97316)'
            : `linear-gradient(90deg, ${playerColorTheme.dot}, ${playerColorTheme.text})`,
          transition: 'width 1s linear, background 0.3s ease',
        }} />
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: 10,
        color: isUrgent ? '#f87171' : 'var(--text-muted)',
        marginTop: 4,
        fontWeight: 700,
      }}>
        {turnTime}s remaining
      </div>
    </div>
  );
};
