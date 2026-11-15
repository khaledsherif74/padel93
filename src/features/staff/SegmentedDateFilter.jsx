export default function SegmentedDateFilter({ items, activeId, onChange, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid w-full grid-cols-3 gap-1 rounded-[14px] bg-[#E3E9F1] p-1"
    >
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item)}
            className={`min-h-10 min-w-0 rounded-[10px] px-1 font-inter text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#01649B] sm:px-2 sm:text-sm ${
              active
                ? 'bg-white font-bold text-[#002346] shadow-[0_1px_3px_rgba(0,35,70,0.15)]'
                : 'bg-transparent text-[#4A5A70] hover:bg-white/50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
