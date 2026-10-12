export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-cairo text-xs font-bold uppercase tracking-[0.15em] text-ball">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-cairo text-3xl font-black leading-tight text-navy sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl font-tajawal text-sm leading-7 text-navy/60">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
