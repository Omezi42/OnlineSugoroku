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

// 効果音の種類ごとの設定（周波数、波形、持続時間を分けてゲームらしいSEを実現）
type SeKind = 'dice' | 'event' | 'goal' | 'coin' | 'lose' | 'step';

interface SeConfig {
  notes: { freq: number; duration: number; delay: number }[];
  type: OscillatorType;
}

const seConfigs: Record<SeKind, SeConfig> = {
  dice: {
    // サイコロが転がるようなカラカラ音
    notes: [
      { freq: 800, duration: 0.06, delay: 0 },
      { freq: 600, duration: 0.06, delay: 0.07 },
      { freq: 900, duration: 0.06, delay: 0.14 },
      { freq: 700, duration: 0.08, delay: 0.21 },
    ],
    type: 'square',
  },
  coin: {
    // チャリンというコイン音
    notes: [
      { freq: 1200, duration: 0.08, delay: 0 },
      { freq: 1600, duration: 0.12, delay: 0.06 },
      { freq: 2000, duration: 0.15, delay: 0.14 },
    ],
    type: 'sine',
  },
  lose: {
    // ブッというマイナス音
    notes: [
      { freq: 200, duration: 0.15, delay: 0 },
      { freq: 150, duration: 0.2, delay: 0.12 },
    ],
    type: 'sawtooth',
  },
  event: {
    // ピロンというイベント音
    notes: [
      { freq: 520, duration: 0.1, delay: 0 },
      { freq: 780, duration: 0.15, delay: 0.1 },
    ],
    type: 'sine',
  },
  goal: {
    // ゴール時のファンファーレ
    notes: [
      { freq: 523, duration: 0.12, delay: 0 },
      { freq: 659, duration: 0.12, delay: 0.12 },
      { freq: 784, duration: 0.12, delay: 0.24 },
      { freq: 1047, duration: 0.3, delay: 0.36 },
    ],
    type: 'sine',
  },
  step: {
    // 1マスずつ進む時のポコポコ音
    notes: [
      { freq: 440, duration: 0.05, delay: 0 },
    ],
    type: 'triangle',
  },
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

  const playSe = useCallback((kind: SeKind = 'event') => {
    if (effectiveSeVolume <= 0) return;
    const config = seConfigs[kind];
    if (!config) return;

    try {
      const audioContext = new AudioContext();
      for (const note of config.notes) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = config.type;
        oscillator.frequency.value = note.freq;
        gain.gain.setValueAtTime(effectiveSeVolume * 0.06, audioContext.currentTime + note.delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + note.delay + note.duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime + note.delay);
        oscillator.stop(audioContext.currentTime + note.delay + note.duration + 0.01);
      }
    } catch {
      // AudioContext が制限されている場合は無視
    }
  }, [effectiveSeVolume]);

  const bgmStyle = useMemo(() => ({
    volume: settings.muted || !settings.bgmEnabled ? 0 : settings.master * settings.bgm,
  }), [settings]);

  return { settings, setSettings, playSe, bgmStyle };
};
