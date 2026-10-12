import { forwardRef } from 'react';
import Input from './Input';

const MoneyInput = forwardRef(function MoneyInput(
  { value, onChange, ...props },
  ref,
) {
  function handleChange(event) {
    const input = event.currentTarget;
    const next = input.value.replace(/[^\d.]/g, '');
    const parts = next.split('.');

    const normalized =
      parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : next;

    const fraction = normalized.split('.')[1];
    const limited =
      fraction?.length > 2
        ? `${normalized.split('.')[0]}.${fraction.slice(0, 2)}`
        : normalized;

    input.value = limited;
    onChange?.(event);
  }

  // When used with react-hook-form's register(), value is undefined and the
  // input must remain uncontrolled. For state-driven forms, keep it controlled.
  const controlledProps = value === undefined ? {} : { value: value ?? '' };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...props}
      {...controlledProps}
      onChange={handleChange}
    />
  );
});

export default MoneyInput;
