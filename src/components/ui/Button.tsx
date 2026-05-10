import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'ghost';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "variant"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: ReactNode;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors outline-none cursor-pointer';
  
  const variants = {
    primary: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50',
    secondary: 'bg-white text-slate-800 shadow-md hover:bg-slate-50',
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 text-slate-800 hover:bg-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.05)]',
    ghost: 'bg-transparent hover:bg-black/5 text-slate-700',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-3',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
};
