import { useEffect, useState } from 'react';
import type { GameState } from '../types/game';
import { subscribeToGameState } from '../services/gameService';

export const useGameSync = (roomId: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToGameState(
      roomId,
      (state) => {
        setGameState(state);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  return { gameState, error, isLoading };
};
