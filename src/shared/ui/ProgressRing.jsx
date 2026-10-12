export default function ProgressRing({
  value = 0,
  size = 128,
  stroke = 10,
  label,
  sublabel,
}) {
  const safe = Math.max(0, Math.min(1, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * safe;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={sublabel ? `${label} ${sublabel}` : label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(146 198 76)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="font-cairo text-2xl font-black text-white">
          {label}
        </strong>
        {sublabel && (
          <span className="mt-1 font-tajawal text-[11px] text-white/60">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
