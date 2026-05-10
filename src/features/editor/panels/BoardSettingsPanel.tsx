import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { DiceType, ParameterDef } from '../../../types/board';
import { Settings, X, Plus, Trash2 } from 'lucide-react';

interface BoardSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BoardSettingsPanel = ({ isOpen, onClose }: BoardSettingsPanelProps) => {
  const { boardSettings, updateBoardSettings } = useEditorStore();

  if (!isOpen) return null;

  // パラメータの追加
  const addParameter = () => {
    const id = `param-${Date.now()}`;
    updateBoardSettings({
      parameters: [...boardSettings.parameters, { id, name: '新しいステータス', initialValue: 0 }],
    });
  };

  // パラメータの更新
  const updateParameter = (index: number, updates: Partial<ParameterDef>) => {
    const params = [...boardSettings.parameters];
    params[index] = { ...params[index], ...updates };
    updateBoardSettings({ parameters: params });
  };

  // パラメータの削除
  const removeParameter = (index: number) => {
    updateBoardSettings({
      parameters: boardSettings.parameters.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pointer-events-auto" onClick={onClose}>
      <GlassCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-3xl border-purple-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-7 h-7 text-purple-500" />
              ボード設定
            </h2>
            <p className="text-xs text-slate-500 mt-1">すごろくのルールやシステムをカスタマイズします</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            
            {/* Left Column: Core Rules */}
            <div className="space-y-8">
              {/* === サイコロの種類 === */}
              <section className="bg-white/40 p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center text-xs">🎲</span>
                  サイコロの種類
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {['1d6', '2d6', '1d4', '1d10', 'coin'].map((type) => (
                    <button
                      key={type}
                      onClick={() => updateBoardSettings({ diceType: type as DiceType })}
                      className={`p-3 rounded-xl text-sm font-bold transition-all border-2 ${
                        boardSettings.diceType === type 
                        ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-sm' 
                        : 'bg-white border-transparent text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {type === '1d6' ? '1d6 (1-6)' :
                       type === '2d6' ? '2d6 (2-12)' :
                       type === '1d4' ? '1d4 (1-4)' :
                       type === '1d10' ? '1d10 (1-10)' : 'コイン (1-2)'}
                    </button>
                  ))}
                </div>
              </section>

              {/* === 勝利条件 === */}
              <section className="bg-white/40 p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-xs">🏆</span>
                  勝利条件
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => updateBoardSettings({ winCondition: { ...boardSettings.winCondition, type: 'speed' } })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${boardSettings.winCondition.type === 'speed' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      スピード（ゴール順）
                    </button>
                    <button
                      onClick={() => updateBoardSettings({ winCondition: { ...boardSettings.winCondition, type: 'status' } })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${boardSettings.winCondition.type === 'status' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      ステータス（所持金など）
                    </button>
                  </div>
                  
                  {boardSettings.winCondition.type === 'status' && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">判定するステータス</label>
                      <select
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                        value={boardSettings.winCondition.targetParamId || ''}
                        onChange={(e) => updateBoardSettings({
                          winCondition: { ...boardSettings.winCondition, targetParamId: e.target.value },
                        })}
                      >
                        <option value="">対象を選択...</option>
                        {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* === BGM設定 === */}
              <section className="bg-white/40 p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center text-xs">🎵</span>
                  BGM設定
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {['none', 'chill', 'ambient', 'lofi', 'cafe', 'upbeat'].map((bgm) => (
                    <button
                      key={bgm}
                      onClick={() => updateBoardSettings({ bgmType: bgm })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        (boardSettings.bgmType || 'none') === bgm 
                        ? 'bg-blue-50 border-blue-400 text-blue-700' 
                        : 'bg-white border-transparent text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {bgm === 'none' ? 'なし' : bgm.toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>

              {/* === アクセシビリティ設定 === */}
              <section className="bg-white/40 p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center text-xs">👁️</span>
                  アクセシビリティ
                </h3>
                <label className="flex items-center justify-between p-3 bg-white/70 rounded-xl border border-slate-100 cursor-pointer hover:bg-white transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-700">アニメーションを軽減</span>
                    <span className="text-[10px] text-slate-400">サイコロやコマ移動の演出を控えめにします</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={boardSettings.reducedMotion || false}
                      onChange={(e) => updateBoardSettings({ reducedMotion: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </div>
                </label>
              </section>
            </div>

            {/* Right Column: Parameters & Rewards */}
            <div className="space-y-8">
              {/* === パラメータ定義 === */}
              <section>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-100 text-purple-500 rounded-lg flex items-center justify-center text-xs">📊</span>
                  ステータス設定
                </h3>
                <div className="space-y-2">
                  {boardSettings.parameters.map((param, idx) => (
                    <div key={param.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-slate-100 group">
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 ml-1 mb-0.5 block uppercase tracking-wider">名前</label>
                        <input
                          type="text"
                          className="w-full p-2 text-sm font-bold rounded-lg border border-slate-100 bg-white focus:ring-2 focus:ring-purple-400 outline-none"
                          value={param.name}
                          onChange={(e) => updateParameter(idx, { name: e.target.value })}
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] font-bold text-slate-400 ml-1 mb-0.5 block uppercase tracking-wider">初期値</label>
                        <input
                          type="number"
                          className="w-full p-2 text-sm font-bold rounded-lg border border-slate-100 bg-white focus:ring-2 focus:ring-purple-400 outline-none"
                          value={param.initialValue}
                          onChange={(e) => updateParameter(idx, { initialValue: Number(e.target.value) })}
                        />
                      </div>
                      <button onClick={() => removeParameter(idx)} className="mt-4 p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addParameter}
                    className="w-full py-4 border-2 border-dashed border-purple-200 text-purple-400 rounded-2xl text-sm font-bold hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus className="w-5 h-5" /> ステータスを増やす
                  </button>
                </div>
              </section>

              {/* === ゴール報酬 === */}
              <section>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-pink-100 text-pink-500 rounded-lg flex items-center justify-center text-xs">🎁</span>
                  ゴール報酬
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((rank) => (
                    <div key={rank} className="p-4 bg-white/70 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          rank === 1 ? 'bg-yellow-400 text-white' :
                          rank === 2 ? 'bg-slate-300 text-white' : 'bg-amber-600/60 text-white'
                        }`}>
                          {rank}位
                        </span>
                        <span className="text-xs font-bold text-slate-600">ボーナス</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {boardSettings.parameters.map((param) => (
                          <div key={param.id}>
                            <label className="text-[9px] font-bold text-slate-400 ml-1 block mb-1">{param.name}</label>
                            <div className="relative">
                              <input
                                type="number"
                                className="w-full p-2 pr-8 text-sm font-bold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-pink-400 outline-none"
                                value={boardSettings.goalRewards[rank]?.[param.id] || 0}
                                onChange={(e) => {
                                  const rewards = { ...boardSettings.goalRewards };
                                  if (!rewards[rank]) rewards[rank] = {};
                                  rewards[rank] = { ...rewards[rank], [param.id]: Number(e.target.value) };
                                  updateBoardSettings({ goalRewards: rewards });
                                }}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">GET</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white/80">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold shadow-xl hover:shadow-purple-200 hover:-translate-y-0.5 transition-all"
          >
            設定を保存して閉じる
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
