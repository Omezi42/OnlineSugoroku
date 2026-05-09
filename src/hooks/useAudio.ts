import { useCallback } from 'react';
import { audioManager, type SoundEffect, type BGMType } from '../services/audioManager';

export const useAudio = () => {
  const playSe = useCallback((type: SoundEffect) => {
    audioManager.playSe(type);
  }, []);

  const playBgm = useCallback((type: BGMType) => {
    audioManager.playBgm(type);
  }, []);

  const stopBgm = useCallback(() => {
    audioManager.stopBgm();
  }, []);

  const setVolume = useCallback((se: number, bgm: number) => {
    audioManager.setVolume(se, bgm);
  }, []);

  return { playSe, playBgm, stopBgm, setVolume };
};
