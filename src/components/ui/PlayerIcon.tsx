import { cn } from '../../lib/cn';

interface PlayerIconProps {
  icon: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-xl',
  xl: 'w-16 h-16 text-3xl',
};

export const PlayerIcon = ({ icon, className, size = 'md' }: PlayerIconProps) => {
  const isImage = icon.startsWith('data:image/') || icon.startsWith('http');

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full overflow-hidden flex-shrink-0",
        !isImage && "bg-white/50 shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {isImage ? (
        <img src={icon} alt="Player Icon" className="w-full h-full object-cover" />
      ) : (
        <span>{icon}</span>
      )}
    </div>
  );
};
