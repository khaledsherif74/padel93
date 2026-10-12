const tones = {
  neutral: 'bg-navy/6 text-navy dark:bg-white/8 dark:text-white',
  success: 'bg-ball/20 text-navy dark:text-ball',
  warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  danger: 'bg-red-500/10 text-red-800 dark:text-red-200',
  info: 'bg-court/10 text-court dark:bg-court/20 dark:text-white',
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-cairo text-xs font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
