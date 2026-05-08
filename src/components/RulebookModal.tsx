import { motion } from 'framer-motion';
import { X, MousePointer2, Share2, Sparkles, Trophy, Workflow, Wand2, Volume2 } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

interface RulebookModalProps {
  onClose: () => void;
}

const sections = [
  {
    icon: MousePointer2,
    title: '盤面を作る',
    body: '左のマスをキャンバスに置き、線でつなぐとルートになります。マスを選ぶと、名前・説明・色・サイズ・画像・イベントを設定できます。',
  },
  {
    icon: Workflow,
    title: 'イベントを組み合わせる',
    body: 'お金の増減、移動、休み、ワープ、条件分岐、ランダム分岐、奪う、ミニゲームなどを複数並べて、止まった時の演出を作れます。',
  },
  {
    icon: Wand2,
    title: 'エディタのコツ',
    body: 'テンプレートで土台を作り、自動整列とグリッド吸着でマスをそろえます。盤面チェックを押すと、スタートやゴール、分岐設定の抜けを確認できます。',
  },
  {
    icon: Share2,
    title: '共有して遊ぶ',
    body: '保存するとプレイ用URLが発行されます。ロビーで名前とアイコンを決め、ホストが開始すると全員の画面が同期されます。',
  },
  {
    icon: Trophy,
    title: '勝利条件',
    body: '早くゴールした順、または指定ステータスの多さでランキングできます。ゴール順位ボーナスも盤面設定から調整できます。',
  },
  {
    icon: Volume2,
    title: '音量設定',
    body: 'BGM、効果音、マスター音量をそれぞれ調整できます。公共の場所や通話中でも遊びやすいよう、すぐミュートできます。',
  },
  {
    icon: Sparkles,
    title: 'イベントの考え方',
    body: '良い盤面は「少し得する」「少し困る」「選択する」「一発逆転する」のリズムが大切です。序盤は軽め、終盤は派手めにすると盛り上がります。',
  },
];

export const RulebookModal = ({ onClose }: RulebookModalProps) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        className="w-full max-w-3xl"
      >
        <GlassCard className="p-6 md:p-8 max-h-[88vh] overflow-y-auto shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:bg-white/70 hover:text-slate-700 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 pr-10">
            <p className="text-sm font-bold text-purple-600 mb-2">OnlineSugoroku チュートリアル</p>
            <h2 className="text-3xl font-black text-slate-900">作って、共有して、みんなで進む。</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              OnlineSugorokuは、自由な盤面エディタとURLひとつで遊べる同期プレイを組み合わせた、カスタムすごろくメーカーです。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-2xl bg-white/65 border border-white/70 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 text-purple-600 flex items-center justify-center">
                    <section.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800">{section.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{section.body}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
