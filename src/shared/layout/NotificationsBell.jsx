import { Bell, CheckCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../app/api';
import { formatDateTime } from '../lib/date';
import Button from '../ui/Button';
import { selectRole } from '../../features/auth/authSelectors';
import { placePanel } from './panelPlacement';

export default function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const role = useSelector(selectRole);
  const [open, setOpen] = useState(false);
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [placement, setPlacement] = useState(null);

  const { data } = useGetNotificationsQuery(
    { unread: 'true', limit: 20 },
    { pollingInterval: 30_000 },
  );

  useEffect(() => {
    function handlePointer(event) {
      const clickedBell = containerRef.current?.contains(event.target);
      const clickedPanel = panelRef.current?.contains(event.target);
      if (!clickedBell && !clickedPanel) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement(
        placePanel({
          anchor: rect,
          viewportWidth: window.innerWidth,
          rtl: document.documentElement.dir === 'rtl',
        }),
      );
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const handoverPath = role === 'STAFF' ? '/app/staff/handover' : '/app/accountant/handovers';

  async function openNotification(item) {
    try {
      await markRead(item.id).unwrap();
    } catch {
      // Navigation should still be available if marking the notice fails.
    }
    setOpen(false);
    if (String(item.type ?? '').startsWith('TRANSFER_')) navigate(handoverPath);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-11 items-center justify-center rounded-xl text-white/75 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ball"
        aria-label={t('notifications.open')}
        aria-expanded={open}
      >
        <Bell className="size-5" strokeWidth={1.8} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute end-2 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-ball px-1 font-cairo text-[9px] font-black text-navy">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        placement &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: placement.top, left: placement.left, width: placement.width }}
            className="fixed z-[100] overflow-hidden rounded-2xl border border-navy/10 bg-white text-navy shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
              <div>
                <h2 className="font-cairo text-sm font-extrabold">{t('notifications.title')}</h2>
                <p className="font-tajawal text-xs text-navy/50">
                  {t('notifications.count', { count: unreadCount })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full text-navy/55 hover:bg-navy/5"
                aria-label={t('common.close')}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-auto">
              {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Bell className="mx-auto size-6 text-ball" aria-hidden="true" />
                  <p className="mt-3 font-cairo text-sm font-bold">{t('notifications.empty')}</p>
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className="block w-full border-b border-navy/5 px-4 py-4 text-start transition hover:bg-navy/[0.025]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ball" />
                      <div className="min-w-0 flex-1">
                        <p className="font-cairo text-sm font-bold">{item.title}</p>
                        <p className="mt-1 font-tajawal text-sm leading-6 text-navy/65">
                          {item.body}
                        </p>
                        <p className="mt-2 font-tajawal text-[11px] text-navy/40">
                          {formatDateTime(item.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-navy/10 p-3">
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" className="min-w-0 flex-1" onClick={() => markAll()}>
                    <CheckCheck className="size-4" aria-hidden="true" />
                    {t('notifications.markAll')}
                  </Button>
                )}
                <Link
                  to="/app/notifications"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-transparent px-4 py-3 font-cairo text-sm font-bold text-navy outline-none transition hover:bg-navy/5 focus-visible:ring-2 focus-visible:ring-edge"
                >
                  {t('notifications.openPage')}
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
