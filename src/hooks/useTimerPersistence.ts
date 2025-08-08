import { useEffect, useCallback } from 'react';

interface TimerPersistenceOptions {
  testId: string;
  duration: number; // in seconds
  onTimeUp?: () => void;
}

export function useTimerPersistence({
  testId,
  duration,
  onTimeUp
}: TimerPersistenceOptions) {
  const STORAGE_KEY = `timer-${testId}`;

  // Get initial time remaining
  const getInitialTime = (): number => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return duration;

      const { startTime, duration: storedDuration } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = storedDuration - elapsed;

      return remaining > 0 ? remaining : 0;
    } catch {
      return duration;
    }
  };

  // Save timer state
  const saveTimerState = useCallback((timeRemaining: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startTime: Date.now() - ((duration - timeRemaining) * 1000),
        duration: duration,
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save timer state:', error);
    }
  }, [STORAGE_KEY, duration]);

  // Clear timer state
  const clearTimerState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear timer state:', error);
    }
  }, [STORAGE_KEY]);

  // Check if time is up on mount
  useEffect(() => {
    const remaining = getInitialTime();
    if (remaining <= 0 && onTimeUp) {
      onTimeUp();
    }
  }, []);

  return {
    getInitialTime,
    saveTimerState,
    clearTimerState
  };
}
