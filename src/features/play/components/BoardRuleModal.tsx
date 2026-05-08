import { motion } from 'framer-motion';
import { Trophy, Dices, Award, X } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { BoardSettings } from '../../../types/board';

interface BoardRuleModalProps {
  settings: BoardSettings;
  onClose: () => void;
}

export const BoardRuleModal = ({ settings, onClose }: BoardRuleModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg"
      >
        <GlassCard className="p-6 relative shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-500" />
            このすごろくのルール
          </h2>

          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                勝利条件
              </h3>
              <div className="bg-white/60 p-4 rounded-xl text-slate-800 font-medium">
                {settings.winCondition.type === 'speed' ? (
                  <span>早くゴールした人が上位になります（スピード勝負）</span>
                ) : (
                  <span>
                    ゲーム終了時に「
                    <span className="text-purple-600 font-bold">
                      {settings.parameters.find(p => p.id === settings.winCondition.targetParamId)?.name || '特定のステータス'}
                    </span>
                    」が一番多い人が上位になります（ステータス勝負）
                  </span>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2">
                <Dices className="w-4 h-4" />
                使用するサイコロ
              </h3>
              <div className="bg-white/60 px-4 py-3 rounded-xl text-slate-800 font-medium font-mono text-center text-lg shadow-sm border border-slate-200 inline-block">
                {settings.diceType}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-500 mb-2">初期ステータス</h3>
              <div className="grid grid-cols-2 gap-2">
                {settings.parameters.map(param => (
                  <div key={param.id} className="bg-white/60 p-3 rounded-xl flex justify-between items-center shadow-sm border border-slate-100">
                    <span className="text-sm font-bold text-slate-700">{param.name}</span>
                    <span className="text-sm font-black text-slate-800">{param.initialValue}</span>
                  </div>
                ))}
                {settings.parameters.length === 0 && (
                  <div className="text-sm text-slate-400 col-span-2 text-center p-2">ステータスはありません</div>
                )}
              </div>
            </section>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            閉じる
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
};
