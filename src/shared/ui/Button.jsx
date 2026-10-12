import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-ball text-navy hover:bg-ball/90 focus-visible:ring-ball',
  secondary: 'bg-navy text-white hover:bg-court focus-visible:ring-edge',
  ghost: 'bg-transparent text-navy hover:bg-navy/5 focus-visible:ring-edge',
  darkGhost: 'bg-white/5 text-white hover:bg-white/10 focus-visible:ring-white/40',
};

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-cairo text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
