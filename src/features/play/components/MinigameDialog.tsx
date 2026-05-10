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

// === 連打勝負 ===
const MashingGame = ({ onResult, isOwner, playerName }: { onResult: (won: boolean) => void, isOwner: boolean, playerName: string }) => {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const target = 25;
  const { playSe } = useAudio();

  const start = () => {
    if (!isOwner) return;
    setIsPlaying(true);
    playSe('click');
    const startAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startAt) / 1000;
      const remaining = Math.max(5.0 - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finish(startAt);
      }
    }, 50);
  };

  const finish = (startAt: number) => {
    setIsPlaying(false);
    // 最終的なカウントで判定（ステートの更新が間に合わない可能性を考慮して少し余裕を持たせるか、あるいは最新値を参照）
    setCount(prev => {
      const won = prev >= target;
      setResult(won ? '🎉 成功！' : '😢 失敗...');
      playSe(won ? 'win' : 'lose');
      setTimeout(() => onResult(won), 2000);
      return prev;
    });
  };

  const handleClick = () => {
    if (!isPlaying || !isOwner) return;
    setCount(c => c + 1);
    playSe('click');
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">🔥 連打勝負！</h3>
      <p className="text-sm text-slate-500 mb-4">5秒以内に {target}回 連打せよ！</p>
      
      <div className="flex justify-around items-center mb-6">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase font-bold">Time</p>
          <span className={`text-4xl font-black ${timeLeft < 1 ? 'text-red-500 animate-ping' : 'text-slate-700'}`}>
            {timeLeft.toFixed(1)}
          </span>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase font-bold">Count</p>
          <span className="text-4xl font-black text-purple-600">{count}</span>
        </div>
      </div>

      {result ? (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold text-pink-600">{result}</motion.p>
      ) : (
        isOwner ? (
          !isPlaying ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={start}
              className="px-12 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl shadow-lg text-xl"
            >
              START!
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClick}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 text-white font-black shadow-[0_0_20px_rgba(236,72,153,0.5)] flex items-center justify-center text-3xl select-none"
            >
              PUSH!
            </motion.button>
          )
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-500 font-bold">{playerName} さんが連打中！</p>
          </div>
        )
      )}
    </div>
  );
};

// === タイミングゲーム ===
const TimingGame = ({ onResult, isOwner, playerName }: { onResult: (won: boolean) => void, isOwner: boolean, playerName: string }) => {
  const [pos, setPos] = useState(0); // 0-100
  const [isPlaying, setIsPlaying] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const { playSe } = useAudio();
  
  // バーの動き
  useState(() => {
    let currentPos = 0;
    let direction = 1;
    const speed = 2.5;
    const interval = setInterval(() => {
      if (!isPlaying) {
        clearInterval(interval);
        return;
      }
      currentPos += speed * direction;
      if (currentPos >= 100 || currentPos <= 0) direction *= -1;
      setPos(currentPos);
    }, 20);
    return () => clearInterval(interval);
  });

  const stop = () => {
    if (!isOwner || !isPlaying) return;
    setIsPlaying(false);
    playSe('click');

    const won = pos >= 40 && pos <= 60; // 中央 20% が当たり
    setResult(won ? '🎉 成功！' : '😢 失敗...');
    playSe(won ? 'win' : 'lose');
    setTimeout(() => onResult(won), 2000);
  };

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">🎯 タイミング</h3>
      <p className="text-sm text-slate-500 mb-6">中央のゾーンでバーを止めろ！</p>

      <div className="relative w-full h-12 bg-slate-100 rounded-xl overflow-hidden mb-8 border border-slate-200">
        {/* 当たりゾーン */}
        <div className="absolute top-0 left-[40%] w-[20%] h-full bg-emerald-400/30 border-x-2 border-emerald-500/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 uppercase">Target</div>
        
        {/* 動くバー */}
        <motion.div
          style={{ left: `${pos}%` }}
          className="absolute top-0 w-1.5 h-full bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-10"
        />
      </div>

      {result ? (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold text-pink-600">{result}</motion.p>
      ) : (
        isOwner ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stop}
            className="px-12 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg"
          >
            STOP!
          </motion.button>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-slate-500 font-bold">{playerName} さんが狙っています...</p>
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
          {action.gameType === 'mashing' && <MashingGame onResult={onResult} isOwner={isOwner} playerName={playerName} />}
          {action.gameType === 'timing' && <TimingGame onResult={onResult} isOwner={isOwner} playerName={playerName} />}
        </GlassCard>
      </motion.div>
    </div>
  );
};
