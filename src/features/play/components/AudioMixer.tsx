import { useSoundSettings } from '../../../hooks/useSoundSettings';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const AudioMixer = () => {
  const { settings, setSettings } = useSoundSettings();

  const toggleMute = () => {
    setSettings({ ...settings, muted: !settings.muted });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, master: parseFloat(e.target.value) });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>音量</span>
            <span>{Math.round(settings.master * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-purple-600 hover:scale-110 transition-transform">
              {settings.muted || settings.master === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={settings.master}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Music size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">BGM有効</span>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, bgmEnabled: !settings.bgmEnabled })}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.bgmEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.bgmEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
