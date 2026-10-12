import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    error,
    id,
    options = [],
    placeholder,
    className = '',
    ...props
  },
  ref,
) {
  const selectId = id || props.name;

  return (
    <label className="block text-navy" htmlFor={selectId}>
      {label && (
        <span className="mb-2 block font-cairo text-sm font-semibold text-navy">
          {label}
        </span>
      )}

      <select
        ref={ref}
        id={selectId}
        className={`min-h-12 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none transition focus:border-edge focus:ring-2 focus:ring-edge/15 ${
          error ? 'border-red-400' : ''
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <span className="mt-1.5 block font-tajawal text-xs text-red-700">{error}</span>}
    </label>
  );
});

export default Select;
