import { useCallback, useEffect, useMemo, useState } from 'react';

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
  }, [settings]);

  const effectiveSeVolume = settings.muted || !settings.seEnabled ? 0 : settings.master * settings.se;

  const playSe = useCallback((kind: 'dice' | 'event' | 'goal' = 'event') => {
    if (effectiveSeVolume <= 0) return;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequency = kind === 'dice' ? 660 : kind === 'goal' ? 880 : 520;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = effectiveSeVolume * 0.08;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, [effectiveSeVolume]);

  const bgmStyle = useMemo(() => ({
    volume: settings.muted || !settings.bgmEnabled ? 0 : settings.master * settings.bgm,
  }), [settings]);

  return { settings, setSettings, playSe, bgmStyle };
};
