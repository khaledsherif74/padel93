export default function SegmentedDateFilter({ items, activeId, onChange, ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex w-full gap-1">
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item)}
            className={`flex min-h-8 flex-1 items-center justify-center rounded-full border px-1 font-cairo text-[10px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-edge sm:min-h-9 sm:px-2 sm:text-xs ${
              active
                ? 'border-[#01649b] bg-[#e6f0f9] text-[#002346]'
                : 'border-navy/15 bg-white text-navy'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
