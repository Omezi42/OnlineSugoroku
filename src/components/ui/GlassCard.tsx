import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from './Button';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = false, ...props }: GlassCardProps) => {
  return (
    <motion.div
      className={cn(
        "glass-panel rounded-3xl p-6 md:p-8",
        hoverEffect && "transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]",
        className
      )}
      whileHover={hoverEffect ? { y: -5 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
};
