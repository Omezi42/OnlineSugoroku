import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { MinigameAction } from '../../../types/board';
import { Loader2 } from 'lucide-react';
import { useAudio } from '../../../hooks/useAudio';

interface MinigameDialogProps {
  action: MinigameAction;
  onResult: (won: boolean) => void;
  isOwner: boolean;
  playerName: string;
}

// === じゃんけん ===
const JankenGame = ({ onResult, isOwner, playerName }: { onResult: (won: boolean) => void, isOwner: boolean, playerName: string }) => {
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [cpuChoice, setCpuChoice] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { playSe } = useAudio();
  const choices = [
    { key: 'rock', emoji: '✊', label: 'グー' },
    { key: 'scissors', emoji: '✌️', label: 'チョキ' },
    { key: 'paper', emoji: '✋', label: 'パー' },
  ];

  const play = (choice: string) => {
    if (!isOwner) return;
    const cpu = choices[Math.floor(Math.random() * 3)].key;
    setMyChoice(choice);
    setCpuChoice(cpu);
    playSe('click');

    let won = false;
    if (choice === cpu) {
      setResult('あいこ！もう一度...');
      setTimeout(() => { setMyChoice(null); setCpuChoice(null); setResult(null); }, 1500);
      return;
    }
    if (
      (choice === 'rock' && cpu === 'scissors') ||
      (choice === 'scissors' && cpu === 'paper') ||
      (choice === 'paper' && cpu === 'rock')
    ) {
      won = true;
      setResult('🎉 勝ち！');
      playSe('win');
    } else {
      setResult('😢 負け...');
      playSe('lose');
    }
    setTimeout(() => onResult(won), 2000);
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-4">✊ じゃんけん ✌️</h3>
      {cpuChoice && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          {choices.find(c => c.key === cpuChoice)?.emoji}
        </motion.div>
      )}
      {result && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold mb-4 text-purple-600">{result}</motion.p>
      )}
      {!myChoice && (
        isOwner ? (
          <div className="flex justify-center gap-4">
            {choices.map(c => (
              <motion.button
                key={c.key}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => play(c.key)}
                className="flex flex-col items-center gap-1 p-4 bg-white/70 rounded-2xl hover:bg-white transition-colors shadow-md"
              >
                <span className="text-4xl">{c.emoji}</span>
                <span className="text-xs font-medium text-slate-600">{c.label}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-500 font-bold">{playerName} さんが考え中...</p>
          </div>
        )
      )}
      {myChoice && (
        <div className="flex justify-center gap-8 items-center">
          <div className="text-center">
            <span className="text-4xl">{choices.find(c => c.key === myChoice)?.emoji}</span>
            <p className="text-xs mt-1 text-slate-500">あなた</p>
          </div>
          <span className="text-2xl font-bold text-slate-400">VS</span>
          <div className="text-center">
            <span className="text-4xl">{choices.find(c => c.key === cpuChoice)?.emoji}</span>
            <p className="text-xs mt-1 text-slate-500">相手</p>
          </div>
        </div>
      )}
    </div>
  );
};

// === ハイ＆ロー ===
const HighLowGame = ({ onResult, isOwner, playerName }: { onResult: (won: boolean) => void, isOwner: boolean, playerName: string }) => {
  const [baseNum] = useState(() => Math.floor(Math.random() * 6) + 1);
  const [guess, setGuess] = useState<'high' | 'low' | null>(null);
  const [actualNum, setActualNum] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { playSe } = useAudio();

  const play = (choice: 'high' | 'low') => {
    if (!isOwner) return;
    const next = Math.floor(Math.random() * 6) + 1;
    setGuess(choice);
    setActualNum(next);
    playSe('click');

    let won = false;
    if (next === baseNum) {
      won = Math.random() > 0.5; // 同値はランダム
    } else if (choice === 'high') {
      won = next > baseNum;
    } else {
      won = next < baseNum;
    }
    setResult(won ? '🎉 当たり！' : '😢 ハズレ...');
    playSe(won ? 'win' : 'lose');
    setTimeout(() => onResult(won), 2000);
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">🎲 ハイ＆ロー</h3>
      <p className="text-sm text-slate-500 mb-4">次の数字はこれより大きい？小さい？</p>
      <motion.div
        initial={{ scale: 0, rotateY: 360 }}
        animate={{ scale: 1, rotateY: 0 }}
        className="text-7xl font-black mb-4 text-purple-600"
      >
        {baseNum}
      </motion.div>
      {actualNum !== null && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4">
          <p className="text-sm text-slate-500">結果</p>
          <span className="text-5xl font-black text-pink-600">{actualNum}</span>
          <p className="text-lg font-bold mt-2 text-purple-600">{result}</p>
        </motion.div>
      )}
      {!guess && (
        isOwner ? (
          <div className="flex justify-center gap-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => play('high')}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-2xl shadow-lg">
              ⬆️ HIGH
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => play('low')}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold rounded-2xl shadow-lg">
              ⬇️ LOW
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-500 font-bold">{playerName} さんが予想中...</p>
          </div>
        )
      )}
    </div>
  );
};

// === 丁半 ===
const ChohanGame = ({ onResult, isOwner, playerName }: { onResult: (won: boolean) => void, isOwner: boolean, playerName: string }) => {
  const [guess, setGuess] = useState<'even' | 'odd' | null>(null);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { playSe } = useAudio();

  const play = (choice: 'even' | 'odd') => {
    if (!isOwner) return;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setGuess(choice);
    setDice([d1, d2]);
    playSe('dice');

    const sum = d1 + d2;
    const isEven = sum % 2 === 0;
    const won = (choice === 'even' && isEven) || (choice === 'odd' && !isEven);
    setResult(won ? '🎉 当たり！' : '😢 ハズレ...');
    playSe(won ? 'win' : 'lose');
    setTimeout(() => onResult(won), 2000);
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">🎲 丁半</h3>
      <p className="text-sm text-slate-500 mb-4">2つのサイコロの合計は偶数？奇数？</p>
      {dice && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center gap-4 mb-4">
          <span className="text-5xl font-black text-purple-600">{dice[0]}</span>
          <span className="text-3xl font-bold text-slate-400 self-center">+</span>
          <span className="text-5xl font-black text-purple-600">{dice[1]}</span>
          <span className="text-3xl font-bold text-slate-400 self-center">=</span>
          <span className="text-5xl font-black text-pink-600">{dice[0] + dice[1]}</span>
        </motion.div>
      )}
      {result && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold mb-4 text-purple-600">{result}</motion.p>
      )}
      {!guess && (
        isOwner ? (
          <div className="flex justify-center gap-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => play('even')}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg">
              丁（偶数）
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => play('odd')}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-2xl shadow-lg">
              半（奇数）
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-500 font-bold">{playerName} さんが勝負中...</p>
          </div>
        )
      )}
    </div>
  );
};

// メインのミニゲームダイアログ
export const MinigameDialog = ({ action, onResult, isOwner, playerName }: MinigameDialogProps) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <GlassCard className="w-[420px] max-w-[95vw] p-8">
          {action.gameType === 'janken' && <JankenGame onResult={onResult} isOwner={isOwner} playerName={playerName} />}
          {action.gameType === 'highlow' && <HighLowGame onResult={onResult} isOwner={isOwner} playerName={playerName} />}
          {action.gameType === 'chouhan' && <ChohanGame onResult={onResult} isOwner={isOwner} playerName={playerName} />}
        </GlassCard>
      </motion.div>
    </div>
  );
};
