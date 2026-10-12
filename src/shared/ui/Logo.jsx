export default function Logo({ className = '', priority: _priority = false }) {
  return (
    <img
      src="/padel93-logo.png"
      alt="PADEL 93"
      width="160"
      height="160"
      className={`h-auto w-40 object-contain ${className}`}
    />
  );
}
