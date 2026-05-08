import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { GlassCard } from '../../../components/ui/GlassCard';

interface BranchChoiceProps {
  options: { edgeId: string; targetNodeId: string; label?: string }[];
  onSelect: (edgeId: string, targetNodeId: string) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

const colors = [
  'from-pink-500 to-rose-600',
  'from-blue-500 to-cyan-600',
  'from-purple-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
];

export const BranchChoice = ({ options, onSelect }: BranchChoiceProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-12 pointer-events-none">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pointer-events-auto"
      >
        <GlassCard className="p-6 max-w-lg w-full">
          <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">🔀 どちらに進む？</h3>
          <p className="text-xs text-slate-500 mb-4 text-center">進む方向を選んでください</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {options.map((opt, i) => (
              <motion.button
                key={opt.edgeId}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(opt.edgeId, opt.targetNodeId)}
                className={`px-6 py-3 bg-gradient-to-r ${colors[i % colors.length]} text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-shadow min-w-[120px]`}
              >
                {opt.label || `ルート ${i + 1}`}
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
