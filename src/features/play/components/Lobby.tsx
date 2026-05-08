import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import { PlayerIcon } from '../../../components/ui/PlayerIcon';
import type { Player } from '../../../types/game';
import { ShareRoomPanel } from './ShareRoomPanel';
import { ImagePlus } from 'lucide-react';

interface LobbyProps {
  roomId: string;
  players: Record<string, Player>;
  playerOrder: string[];
  localPlayerId: string;
  onStartGame: () => void;
  onUpdateName: (name: string) => void;
  onUpdateIcon: (icon: string) => void;
}

const iconOptions = ['🎲', '🎮', '⭐', '🔥', '💎', '🌸', '🐉', '👑', '🎯', '🚀', '🦄', '🍀'];

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
  exit: { opacity: 0, scale: 0.9 },
};

export const Lobby = ({ roomId, players, playerOrder, localPlayerId, onStartGame, onUpdateName, onUpdateIcon }: LobbyProps) => {
  const [name, setName] = useState('');
  const isHost = players[localPlayerId]?.isHost;
  const canStart = isHost;

  const handleNameSubmit = () => {
    if (name.trim()) onUpdateName(name.trim());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/webp', 0.8);
          onUpdateIcon(base64);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-blue-900/80 backdrop-blur-sm">
      <motion.div variants={cardVariants} initial="hidden" animate="visible" exit="exit">
        <GlassCard className="w-[520px] max-w-[95vw] p-8 max-h-[92vh] overflow-y-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">🎲 すごろくロビー</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <span>Room:</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{roomId}</code>
            </div>
          </div>

          <div className="mb-6">
            <ShareRoomPanel roomId={roomId} />
          </div>

          {/* 自分の名前設定 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">あなたの名前</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="名前を入力..."
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white/70 outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                maxLength={12}
              />
              <button
                onClick={handleNameSubmit}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
              >
                決定
              </button>
            </div>
          </div>

          {/* アイコン選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">アイコン</label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer shadow-sm border border-purple-200" title="画像をアップロード">
                <ImagePlus className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  onClick={() => onUpdateIcon(icon)}
                  className={`text-2xl w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                    players[localPlayerId]?.icon === icon
                      ? 'bg-purple-100 ring-2 ring-purple-400 scale-110 shadow-md'
                      : 'bg-white/50 hover:bg-white/80 shadow-sm border border-slate-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
              {players[localPlayerId]?.icon.startsWith('data:image') && (
                <div className="ml-2 w-10 h-10 rounded-xl bg-purple-100 ring-2 ring-purple-400 scale-110 shadow-md overflow-hidden flex items-center justify-center">
                  <PlayerIcon icon={players[localPlayerId].icon} size="md" />
                </div>
              )}
            </div>
          </div>

          {/* 参加者リスト */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">参加者 ({playerOrder.length}人)</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {playerOrder.map((pid) => {
                  const p = players[pid];
                  if (!p) return null;
                  return (
                    <motion.div
                      key={pid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        pid === localPlayerId ? 'bg-purple-50 ring-1 ring-purple-200' : 'bg-white/50'
                      }`}
                    >
                      <PlayerIcon icon={p.icon} size="sm" />
                      <span className="font-medium text-sm flex-1">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">HOST</span>
                      )}
                      {pid === localPlayerId && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">YOU</span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ゲーム開始ボタン */}
          {canStart ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartGame}
              disabled={playerOrder.length < 1}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isHost ? '🎮 ゲームスタート！' : '🎮 このメンバーで開始する'}
            </motion.button>
          ) : (
            <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-medium text-center">
              ホストの開始を待っています...
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
