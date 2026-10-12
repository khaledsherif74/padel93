import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Input = forwardRef(function Input(
  { label, error, hint, id, className = '', type = 'text', required = false, ...props },
  ref,
) {
  const { t } = useTranslation();
  const generatedId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const isPhone = props.inputMode === 'tel' || props.type === 'tel';
  const inputId = id || props.name || `input-${generatedId}`;
  const inputType = type === 'password' && showPassword ? 'text' : type;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="block text-navy">
      {label && (
        <label htmlFor={inputId} className="mb-2 block font-cairo text-sm font-semibold text-navy">
          {label}
          {required && (
            <span className="ms-1 text-red-700" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          minLength={isPhone ? 11 : undefined}
          maxLength={isPhone ? 11 : undefined}
          className={`min-h-12 w-full rounded-xl border bg-white px-4 py-3 font-tajawal text-base text-navy outline-none transition placeholder:text-navy/35 focus:border-edge focus:ring-2 focus:ring-edge/15 ${
            type === 'password' ? 'pe-12' : ''
          } ${error ? 'border-red-400' : 'border-navy/10'} ${className}`}
          {...props}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-navy/55 outline-none transition hover:bg-navy/5 hover:text-navy focus-visible:ring-2 focus-visible:ring-edge"
            aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
            title={showPassword ? t('common.hidePassword') : t('common.showPassword')}
          >
            {showPassword ? (
              <EyeOff className="size-5" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Eye className="size-5" strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 block font-tajawal text-xs text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 block font-tajawal text-xs text-navy/55">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
