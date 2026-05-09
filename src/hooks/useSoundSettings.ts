import { useCallback, useEffect, useState } from 'react';
import { audioManager, type SoundEffect, type BGMType } from '../services/audioManager';

export interface SoundSettings {
  master: number;
  bgm: number;
  se: number;
  muted: boolean;
  bgmEnabled: boolean;
  seEnabled: boolean;
}

const STORAGE_KEY = 'online-sugoroku-sound-settings';
const defaultSettings: SoundSettings = {
  master: 0.7,
  bgm: 0.35,
  se: 0.75,
  muted: false,
  bgmEnabled: true,
  seEnabled: true,
};

export const useSoundSettings = () => {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    audioManager.setVolume(
      settings.master * settings.se,
      settings.master * settings.bgm
    );
    audioManager.setMuted(settings.muted);
  }, [settings]);

  const playSe = useCallback((kind: SoundEffect = 'event') => {
    if (settings.muted || !settings.seEnabled) return;
    audioManager.playSe(kind);
  }, [settings.muted, settings.seEnabled]);

  const playBgm = useCallback((type: BGMType) => {
    if (settings.muted || !settings.bgmEnabled) return;
    audioManager.playBgm(type);
  }, [settings.muted, settings.bgmEnabled]);

  const stopBgm = useCallback(() => {
    audioManager.stopBgm();
  }, []);

  return { settings, setSettings, playSe, playBgm, stopBgm };
};
