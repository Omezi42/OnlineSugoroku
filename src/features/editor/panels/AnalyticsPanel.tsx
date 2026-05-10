import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Users, Flag, Clock, Activity, TrendingUp } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { BoardData } from '../../../services/boardService';

interface AnalyticsPanelProps {
  boardData: BoardData;
  onClose: () => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ boardData, onClose }) => {
  const stats = boardData.stats;

  const metrics = useMemo(() => {
    if (!stats) return null;
    const playCount = stats.playCount || 0;
    const goalCount = stats.goalCount || 0;
    const goalRate = playCount > 0 ? (goalCount / playCount) * 100 : 0;
    const avgTime = goalCount > 0 ? stats.totalPlayTimeSeconds / goalCount : 0;
    
    // 最多着地ノードの特定
    const landings = Object.entries(stats.nodeLandings || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        count,
        label: boardData.nodes.find(n => n.id === id)?.data.label || '不明なマス'
      }));

    // 最多脱落ノードの特定
    const retires = Object.entries(stats.retirePoints || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id, count]) => ({
        id,
        count,
        label: boardData.nodes.find(n => n.id === id)?.data.label || '不明なマス'
      }));

    return { playCount, goalCount, goalRate, avgTime, landings, retires };
  }, [stats, boardData.nodes]);

  if (!stats) {
    return (
      <div className="absolute inset-0 md:inset-auto md:right-4 md:top-4 md:bottom-4 md:w-96 z-50">
        <GlassCard className="h-full flex flex-col p-6 shadow-2xl rounded-none md:rounded-2xl border-white/40">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              盤面アナリティクス
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Activity className="w-8 h-8" />
            </div>
            <p className="text-slate-500 text-sm">
              統計データがまだありません。<br />
              誰かがプレイするとここに表示されます。
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 md:inset-auto md:right-4 md:top-4 md:bottom-4 md:w-96 z-50">
      <GlassCard className="h-full flex flex-col p-6 shadow-2xl rounded-none md:rounded-2xl border-white/40 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            盤面アナリティクス
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 基本メトリクス */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold mb-1 uppercase">
                <Users className="w-3 h-3" /> プレイ回数
              </div>
              <div className="text-2xl font-black text-slate-800">{metrics?.playCount}</div>
            </div>
            <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold mb-1 uppercase">
                <Flag className="w-3 h-3" /> クリア率
              </div>
              <div className="text-2xl font-black text-purple-600">{metrics?.goalRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold mb-1 uppercase">
                <Clock className="w-3 h-3" /> 平均クリア時間
              </div>
              <div className="text-2xl font-black text-blue-600">
                {metrics?.avgTime ? `${Math.floor(metrics.avgTime / 60)}m${Math.floor(metrics.avgTime % 60)}s` : '-'}
              </div>
            </div>
            <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold mb-1 uppercase">
                <TrendingUp className="w-3 h-3" /> ゴール数
              </div>
              <div className="text-2xl font-black text-pink-500">{metrics?.goalCount}</div>
            </div>
          </div>

          {/* 人気のマス（着地数） */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> 着地数が多いマス TOP5
            </h3>
            <div className="space-y-2">
              {metrics?.landings.map((node, i) => (
                <div key={node.id} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-300 w-4"># {i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-700 truncate max-w-[180px]">{node.label}</span>
                      <span className="text-slate-500 font-mono">{node.count}回</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(node.count / (metrics.landings[0]?.count || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 脱落ポイント */}
          {metrics?.retires && metrics.retires.length > 0 && (
            <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
              <h3 className="text-xs font-bold text-red-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                ⚠️ 脱落が多いマス（リタイア地点）
              </h3>
              <div className="space-y-3">
                {metrics.retires.map((node) => (
                  <div key={node.id} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 truncate pr-2">{node.label}</span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {node.count} 名
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-red-400 leading-relaxed">
                ※ プレイヤーが「退出」ボタンを押した際の位置を集計しています。この付近の難易度が高すぎる可能性があります。
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
