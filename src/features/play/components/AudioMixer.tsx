import { Volume2, VolumeX } from 'lucide-react';
import type { SoundSettings } from '../../../hooks/useSoundSettings';

interface AudioMixerProps {
  settings: SoundSettings;
  onChange: (settings: SoundSettings) => void;
}

export const AudioMixer = ({ settings, onChange }: AudioMixerProps) => {
  const update = (patch: Partial<SoundSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="rounded-2xl bg-white/90 p-3 text-xs shadow-lg backdrop-blur-md">
      <button
        onClick={() => update({ muted: !settings.muted })}
        className="mb-2 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 font-bold text-slate-700"
      >
        <span className="flex items-center gap-2">
          {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          音量ミキサー
        </span>
        <span>{settings.muted ? 'ミュート' : 'ON'}</span>
      </button>
      {[
        ['master', 'マスター'],
        ['bgm', 'BGM'],
        ['se', 'SE'],
      ].map(([key, label]) => (
        <label key={key} className="mb-2 grid grid-cols-[64px_1fr_36px] items-center gap-2 text-slate-600">
          <span>{label}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings[key as keyof SoundSettings] as number}
            onChange={(event) => update({ [key]: Number(event.target.value) })}
            className="accent-purple-500"
          />
          <span className="text-right">{Math.round((settings[key as keyof SoundSettings] as number) * 100)}</span>
        </label>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-1 rounded-xl bg-white px-2 py-1">
          <input type="checkbox" checked={settings.bgmEnabled} onChange={(event) => update({ bgmEnabled: event.target.checked })} />
          BGM
        </label>
        <label className="flex items-center gap-1 rounded-xl bg-white px-2 py-1">
          <input type="checkbox" checked={settings.seEnabled} onChange={(event) => update({ seEnabled: event.target.checked })} />
          SE
        </label>
      </div>
    </div>
  );
};
