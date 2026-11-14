export default function MethodRadios({ name, value, onChange, methods, t }) {
  return (
    <div role="radiogroup" aria-label={t('common.method')} className="grid grid-cols-3 gap-2">
      {methods.map((method) => (
        <label key={method} className="block">
          <input
            type="radio"
            name={name}
            value={method}
            checked={value === method}
            onChange={() => onChange(method)}
            className="peer sr-only"
          />
          <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-navy/15 bg-white px-2 text-center font-cairo text-sm font-bold text-navy transition peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-edge">
            {t(`method.${method}`)}
          </span>
        </label>
      ))}
    </div>
  );
}
