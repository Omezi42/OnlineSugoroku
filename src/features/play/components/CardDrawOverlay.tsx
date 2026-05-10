import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardAction, CardItem } from '../../../types/board';
import { Layers, Loader2 } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';

interface CardDrawOverlayProps {
  action: CardAction;
  onResult: (cardId: string) => void;
  isOwner: boolean;
  playerName: string;
}

export const CardDrawOverlay = ({ action, onResult, isOwner, playerName }: CardDrawOverlayProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const { playSe } = useAudio();

  const draw = () => {
    if (isDrawing || !isOwner) return;
    setIsDrawing(true);
    playSe('card');

    const randomIndex = Math.floor(Math.random() * action.cards.length);
    const card = action.cards[randomIndex];
    setSelectedCard(card);

    // アニメーションシーケンス
    setTimeout(() => {
      setIsFlipped(true);
      playSe('event');
      setTimeout(() => {
        setTimeout(() => {
          onResult(card.id);
        }, 2500);
      }, 500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg flex flex-col items-center">
        <h2 className="text-3xl font-black text-white mb-12 tracking-wider drop-shadow-lg flex items-center gap-3">
          <Layers className="w-8 h-8 text-blue-400 fill-current" />
          {action.title}
        </h2>

        <div className="relative w-64 h-96 perspective-1000">
          <AnimatePresence>
            {!selectedCard && (
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center cursor-pointer group"
                onClick={draw}
              >
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-10 h-10 text-white" />
                </div>
                <p className="text-white font-bold tracking-widest">{action.deckName}</p>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {selectedCard && (
            <motion.div
              initial={{ y: 0, x: 0, rotateY: 0 }}
              animate={{ 
                y: isFlipped ? 0 : -50,
                rotateY: isFlipped ? 180 : 0,
                scale: isFlipped ? 1.1 : 1
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full h-full relative preserve-3d"
            >
              {/* カードの裏面 */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl shadow-2xl border-4 border-white/20 flex flex-col items-center justify-center">
                <Layers className="w-16 h-16 text-white/50" />
              </div>

              {/* カードの表面 */}
              <div 
                className="absolute inset-0 backface-hidden rounded-2xl shadow-2xl border-4 flex flex-col p-6 rotate-y-180 bg-white"
                style={{ borderColor: selectedCard.color }}
              >
                <div 
                  className="w-full h-40 rounded-xl mb-4 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: `${selectedCard.color}20` }}
                >
                  {selectedCard.image ? (
                    <img src={selectedCard.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl" style={{ color: selectedCard.color }}>🃏</div>
                  )}
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: selectedCard.color }}>
                  {selectedCard.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {selectedCard.description}
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end">
                   <div className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: selectedCard.color }}>
                     CARD EFFECT
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {!selectedCard && (
          isOwner ? (
            <p className="mt-8 text-white/60 font-medium animate-pulse">タップしてカードを引く</p>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
              <p className="text-white/60 font-medium">{playerName} さんがカードを引いています...</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
