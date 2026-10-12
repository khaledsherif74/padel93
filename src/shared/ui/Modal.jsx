import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({ open, onClose, title, children, className = '' }) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousActiveElement.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusDialog = () => {
      const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
      (firstFocusable || dialogRef.current)?.focus();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (!focusables.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const frame = window.requestAnimationFrame(focusDialog);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/55 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={() => onCloseRef.current?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t('common.dialog')}
        tabIndex={-1}
        className={`max-h-[92vh] w-full overflow-auto rounded-t-3xl border border-navy/10 bg-white text-navy shadow-2xl sm:max-w-xl sm:rounded-3xl ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-4">
          {title ? (
            <h2 id={titleId} className="font-cairo text-lg font-extrabold text-navy">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-navy/60 outline-none hover:bg-navy/5 focus-visible:ring-2 focus-visible:ring-edge"
            aria-label={t('common.close')}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
