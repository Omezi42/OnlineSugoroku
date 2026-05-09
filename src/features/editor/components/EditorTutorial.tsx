import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';

interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: 'tutorial-root',
    title: 'ようこそ！カスタムすごろくメーカーへ',
    content: '自分だけのオリジナルすごろくを作成・共有できるエディターです。基本的な使い方を5ステップでご紹介します！',
    position: 'center',
  },
  {
    targetId: 'node-palette',
    title: '1. マスを追加する',
    content: 'ここから好きなマスをキャンバスにドラッグ＆ドロップして配置できます。スタートとゴールは必ず1つずつ設置しましょう。',
    position: 'right',
  },
  {
    targetId: 'canvas-area',
    title: '2. ルートをつなげる',
    content: 'マスの端にある丸（ハンドル）から別のマスへドラッグすると、移動ルートを作成できます。',
    position: 'center',
  },
  {
    targetId: 'board-settings',
    title: '3. 盤面の設定',
    content: 'すごろくの名前や説明、勝利条件（ゴール順か、お金の多さか等）をここで設定できます。',
    position: 'bottom',
  },
  {
    targetId: 'share-button',
    title: '4. 友達を招待する',
    content: '「URLを知っている人に共同編集を許可」をONにすれば、このURLを共有するだけで友達と一緒に作成できます！',
    position: 'bottom',
  },
  {
    targetId: 'test-play-button',
    title: '5. テストプレイ！',
    content: '準備ができたら、このボタンからすぐに遊べます。自動保存されるので安心してください。',
    position: 'left',
  },
];

export const EditorTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const updateCoords = () => {
      const step = TUTORIAL_STEPS[currentStep];
      if (step.targetId === 'tutorial-root' || step.targetId === 'canvas-area') {
        setCoords({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
        return;
      }

      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const step = TUTORIAL_STEPS[currentStep];

  const getStepStyle = () => {
    const cardWidth = 320;
    const cardHeight = 240; // およその高さ
    const padding = 24;

    let top = 0;
    let left = 0;
    let transform = 'none';

    if (step.position === 'center') {
      top = window.innerHeight / 2;
      left = window.innerWidth / 2;
      transform = 'translate(-50%, -50%)';
    } else if (step.position === 'right') {
      top = coords.top;
      left = coords.left + coords.width + padding;
    } else if (step.position === 'left') {
      top = coords.top;
      left = coords.left - cardWidth - padding;
    } else if (step.position === 'bottom') {
      top = coords.top + coords.height + padding;
      left = coords.left + (coords.width / 2) - (cardWidth / 2);
    } else { // top
      top = coords.top - cardHeight - padding;
      left = coords.left;
    }

    // 画面外はみ出し防止
    if (step.position !== 'center') {
      left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - 300));
    }

    return { top, left, transform };
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Backdrop with hole */}
      <motion.div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${coords.left}px 100%, 
            ${coords.left}px ${coords.top}px, 
            ${coords.left + coords.width}px ${coords.top}px, 
            ${coords.left + coords.width}px ${coords.top + coords.height}px, 
            ${coords.left}px ${coords.top + coords.height}px, 
            ${coords.left}px 100%, 
            100% 100%, 
            100% 0%
          )`,
          pointerEvents: 'auto',
        }}
        onClick={onComplete}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute pointer-events-auto"
          style={getStepStyle()}
        >
          <GlassCard className="w-80 p-6 shadow-2xl border-purple-200/50">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                STEP {currentStep + 1} / {TUTORIAL_STEPS.length}
              </span>
              <button onClick={onComplete} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {step.content}
            </p>

            <div className="flex justify-between items-center">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-0 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:shadow-purple-200 hover:scale-105 transition-all text-sm"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? 'はじめる！' : '次へ'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
