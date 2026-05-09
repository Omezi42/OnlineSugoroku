import { useState } from 'react';
import { useEditorStore } from '../store';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { DiceType, WinConditionType, ParameterDef } from '../../../types/board';
import { Settings, X, Plus, Trash2 } from 'lucide-react';

export const BoardSettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { boardSettings, updateBoardSettings } = useEditorStore();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors flex items-center justify-center gap-2"
      >
        <Settings className="w-4 h-4" />
        ボード設定を開く
      </button>
    );
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <GlassCard className="w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">⚙️ ボード設定</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* === パラメータ定義 === */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">📊 ステータス（パラメータ）</h3>
            <div className="space-y-2">
              {boardSettings.parameters.map((param, idx) => (
                <div key={param.id} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                  <input
                    type="text"
                    className="flex-1 p-1.5 text-sm rounded border border-slate-200 bg-white/50"
                    value={param.name}
                    onChange={(e) => updateParameter(idx, { name: e.target.value })}
                    placeholder="ステータス名"
                  />
                  <input
                    type="number"
                    className="w-20 p-1.5 text-sm rounded border border-slate-200 bg-white/50"
                    value={param.initialValue}
                    onChange={(e) => updateParameter(idx, { initialValue: Number(e.target.value) })}
                    placeholder="初期値"
                  />
                  <button onClick={() => removeParameter(idx)} className="p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addParameter}
              className="mt-2 w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> ステータスを追加
            </button>
          </div>

          {/* === サイコロの種類 === */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">🎲 サイコロの種類</h3>
            <select
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50"
              value={boardSettings.diceType}
              onChange={(e) => updateBoardSettings({ diceType: e.target.value as DiceType })}
            >
              <option value="1d6">1d6（1〜6）</option>
              <option value="2d6">2d6（2〜12）</option>
              <option value="1d4">1d4（1〜4）</option>
              <option value="1d10">1d10（1〜10）</option>
              <option value="coin">コイン（1〜2）</option>
            </select>
          </div>

          {/* === 勝利条件 === */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">🏆 勝利条件</h3>
            <select
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50 mb-2"
              value={boardSettings.winCondition.type}
              onChange={(e) => updateBoardSettings({
                winCondition: { ...boardSettings.winCondition, type: e.target.value as WinConditionType },
              })}
            >
              <option value="speed">スピード（ゴール順）</option>
              <option value="status">ステータス（パラメータの多さ）</option>
            </select>
            {boardSettings.winCondition.type === 'status' && (
              <select
                className="w-full p-2 rounded-lg border border-slate-200 bg-white/50"
                value={boardSettings.winCondition.targetParamId || ''}
                onChange={(e) => updateBoardSettings({
                  winCondition: { ...boardSettings.winCondition, targetParamId: e.target.value },
                })}
              >
                <option value="">対象パラメータを選択...</option>
                {boardSettings.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>


          {/* === ゴール報酬 === */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">🎁 ゴール報酬</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((rank) => (
                <div key={rank} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                  <span className="text-sm font-bold w-8">{rank}位</span>
                  {boardSettings.parameters.map((param) => (
                    <div key={param.id} className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-slate-500">{param.name}</span>
                      <input
                        type="number"
                        className="w-20 p-1 text-sm rounded border border-slate-200 bg-white/50"
                        value={boardSettings.goalRewards[rank]?.[param.id] || 0}
                        onChange={(e) => {
                          const rewards = { ...boardSettings.goalRewards };
                          if (!rewards[rank]) rewards[rank] = {};
                          rewards[rank] = { ...rewards[rank], [param.id]: Number(e.target.value) };
                          updateBoardSettings({ goalRewards: rewards });
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* === BGM設定 === */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">🎵 BGM設定</h3>
            <select
              className="w-full p-2 rounded-lg border border-slate-200 bg-white/50"
              value={boardSettings.bgmType || 'none'}
              onChange={(e) => updateBoardSettings({ bgmType: e.target.value })}
            >
              <option value="none">なし</option>
              <option value="chill">チル（ゆったり）</option>
              <option value="ambient">アンビエント（穏やか）</option>
              <option value="lofi">Lo-fi（作業用）</option>
              <option value="cafe">カフェ（リラックス）</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
        >
          設定を閉じる
        </button>
      </GlassCard>
    </div>
  );
};
