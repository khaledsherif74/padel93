export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-navy/7 dark:bg-white/7 ${className}`} aria-hidden="true" />;
}
