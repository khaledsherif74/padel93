export default function Card({ children, className = '', dark = false }) {
  return (
    <section
      className={`rounded-2xl border shadow-card ${dark ? 'border-white/10 bg-night text-white shadow-card-dark' : 'border-navy/10 bg-white text-navy'} ${className}`}
    >
      {children}
    </section>
  );
}
