import { motion } from 'framer-motion';

export function Card({
  children,
  className = '',
  elevated = false,
  gradient = false,
  hover = false,
  onClick,
  ...props
}) {
  const baseClasses = `
    bg-[var(--bg-surface)] 
    border border-white/10 
    rounded-xl
    ${elevated ? 'shadow-lg' : ''}
    ${gradient ? 'gradient-border' : ''}
    ${hover ? 'hover:border-white/20 transition-colors cursor-pointer' : ''}
  `;
  
  if (onClick || hover) {
    return (
      <motion.div
        className={`${baseClasses} ${className}`}
        onClick={onClick}
        whileHover={hover ? { scale: 1.01, y: -2 } : {}}
        whileTap={onClick ? { scale: 0.99 } : {}}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <div className={`${baseClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-b border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
