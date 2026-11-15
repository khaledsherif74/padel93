import { ChevronLeft, X } from 'lucide-react';
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

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  screen = false,
}) {
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
      className={
        screen
          ? 'fixed inset-0 z-50 flex min-w-0 max-w-full items-stretch justify-center overflow-x-clip bg-[#F3F5F9]'
          : 'fixed inset-0 z-50 flex items-end justify-center bg-navy/55 p-0 sm:items-center sm:p-6'
      }
      role="presentation"
      onMouseDown={screen ? undefined : () => onCloseRef.current?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t('common.dialog')}
        tabIndex={-1}
        className={
          screen
            ? `flex h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-clip overflow-y-auto bg-[#F3F5F9] text-[#0E1B2B] outline-none ${className}`
            : `max-h-[92vh] w-full overflow-auto rounded-t-3xl border border-navy/10 bg-white text-navy shadow-2xl sm:max-w-xl sm:rounded-3xl ${className}`
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        {screen ? (
          <>
            <header className="shrink-0 bg-[#002346] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-5 lg:px-8">
              <div className="mx-auto flex w-full min-w-0 max-w-[1120px] items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => onCloseRef.current?.()}
                  disabled={!onClose}
                  className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#8DC63F] disabled:opacity-45"
                  aria-label={t('common.back')}
                >
                  <ChevronLeft
                    className="size-6 rtl:rotate-180"
                    strokeWidth={2.3}
                    aria-hidden="true"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2
                      id={titleId}
                      className="truncate font-inter text-xl font-extrabold sm:text-2xl"
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 truncate font-inter text-sm text-[#B9C7DA] sm:text-base">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </header>
            <div className="mx-auto w-full min-w-0 max-w-[1120px] flex-1 overflow-x-clip px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
