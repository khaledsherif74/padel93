import { Check, CircleAlert, RefreshCw, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  useConfirmTransferMutation,
  useCreateTransferMutation,
  useGetTransfersQuery,
} from '../../app/api';
import { selectRole } from '../auth/authSelectors';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import MoneyInput from '../../shared/ui/MoneyInput';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function HandoverInboxPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const role = useSelector(selectRole);
  const isOwner = role === 'OWNER';
  // Owners confirm payouts. Accountants confirm handovers. The backend rejects
  // any attempt to confirm your own transfer, and 403s the wrong kind.
  const kind = isOwner ? 'PAYOUT' : 'HANDOVER';
  const query = useGetTransfersQuery(
    { kind, limit: 50 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => query.data?.items?.find((item) => item.id === selectedId) ?? null,
    [query.data, selectedId],
  );

  const pendingItems = (query.data?.items ?? []).filter((item) => item.status === 'PENDING');
  const historyItems = (query.data?.items ?? []).filter((item) => item.status !== 'PENDING');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.handoverEyebrow')}
        title={t('accountant.handoverTitle')}
        description={t('accountant.handoverDescription')}
        actions={
          <Button variant="ghost" onClick={query.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      {/* Owner gets 403 on payout.create, so hide the payout card for owners. */}
      {!isOwner && <PayoutCard t={t} />}

      {query.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(query.error, t)}
          onRetry={query.refetch}
        />
      ) : (
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Send className="size-5 text-edge" aria-hidden="true" />
              <h2 className="font-cairo text-xl font-black text-navy">
                {t('accountant.pendingHandovers')}
              </h2>
            </div>
            <div className="grid gap-3">
              {pendingItems.map((item) => (
                <HandoverRow
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  locale={locale}
                  t={t}
                />
              ))}
              {pendingItems.length === 0 && (
                <EmptyState
                  title={t('accountant.noPendingHandovers')}
                  description={t('accountant.noPendingHandoversHint')}
                />
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <CircleAlert className="size-5 text-edge" aria-hidden="true" />
              <h2 className="font-cairo text-xl font-black text-navy">
                {t('accountant.transferHistory')}
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
              {historyItems.map((item) => (
                <HistoryRow key={item.id} item={item} locale={locale} t={t} />
              ))}
              {historyItems.length === 0 && (
                <div className="p-6 font-tajawal text-sm text-navy/55">
                  {t('accountant.noTransferHistory')}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {selected?.status === 'PENDING' && (
        <ConfirmDrawer item={selected} locale={locale} t={t} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function HandoverRow({ item, selected, onSelect, locale, t }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-5 text-start outline-none transition ${
        selected
          ? 'border-edge bg-court/[0.035] shadow-card'
          : 'border-navy/10 bg-white hover:border-edge/35'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="warning">{t('transferStatus.PENDING')}</Badge>
            <p className="font-cairo text-sm font-bold text-navy">{item.from?.name ?? '—'}</p>
          </div>
          <p className="mt-2 font-tajawal text-sm text-navy/60">
            {item.note || t('accountant.noTransferNote')}
          </p>
        </div>
        <div className="text-end">
          <p className="font-cairo text-lg font-black text-navy">
            {formatEgpWithCurrency(item.amountSent, locale)}
          </p>
          <p className="mt-1 font-tajawal text-xs text-navy/45">
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  );
}

function ConfirmDrawer({ item, locale, t, onClose }) {
  const [received, setReceived] = useState(
    item.amountSent != null ? (item.amountSent / 100).toFixed(2) : '',
  );
  const [note, setNote] = useState('');
  const [confirm, state] = useConfirmTransferMutation();

  // If the typed amount differs from what was sent, a note is mandatory.
  let parsed = null;
  let parseError = false;
  if (received.trim() !== '') {
    try {
      parsed = toPiasters(received);
    } catch {
      parseError = true;
    }
  }
  const differs = parsed != null && parsed !== item.amountSent;
  const needsNote = differs && !note.trim();

  async function submit() {
    if (parsed == null || parseError) return;
    if (parsed < 0) return;
    if (differs && !note.trim()) return;

    try {
      await confirm({
        id: item.id,
        receivedAmount: parsed,
        note: note.trim() || undefined,
      }).unwrap();
      onClose();
    } catch {
      // Error rendered below.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/55 p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('accountant.confirmHandover')}
      >
        <div className="border-b border-navy/10 bg-navy px-5 py-5 text-white sm:px-6">
          <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
            {t('accountant.blindCount')}
          </p>
          <h2 className="mt-1 font-cairo text-2xl font-black">
            {t('accountant.countCashReceived')}
          </h2>
          <p className="mt-2 font-tajawal text-sm leading-6 text-white/65">
            {t('accountant.blindCountHint', { name: item.from?.name ?? '—' })}
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-ball/30 bg-ball/8 p-4">
            <p className="font-cairo text-xs font-bold text-navy">
              {t('accountant.prefilledHint')}
            </p>
          </div>

          <MoneyInput
            label={t('accountant.receivedAmount')}
            value={received}
            onChange={(event) => setReceived(event.target.value)}
          />
          <Input
            label={t('common.noteOptional')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('accountant.transferNotePlaceholder')}
          />

          {needsNote && (
            <p className="font-tajawal text-xs text-red-700" role="alert">
              {t('accountant.rejectNoteRequired')}
            </p>
          )}

          {state.error && (
            <p className="font-tajawal text-sm text-red-700" role="alert">
              {errorMessage(state.error, t)}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button loading={state.isLoading} onClick={submit} disabled={needsNote || parseError}>
              <Check className="size-4" aria-hidden="true" />
              {t('accountant.confirmReceipt')}
            </Button>
            <Button variant="ghost" disabled={state.isLoading} onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ item, locale, t }) {
  return (
    <div className="flex flex-col gap-3 border-b border-navy/7 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              item.status === 'DISPUTED'
                ? 'danger'
                : item.status === 'CONFIRMED'
                  ? 'success'
                  : 'neutral'
            }
          >
            {t(`transferStatus.${item.status}`)}
          </Badge>
          <p className="font-cairo text-sm font-bold text-navy">{item.from?.name ?? '—'}</p>
        </div>
        <p className="mt-1 font-tajawal text-xs text-navy/45">
          {formatDateTime(item.createdAt, locale)}
        </p>
      </div>
      {item.status === 'DISPUTED' ? (
        <div className="text-start sm:text-end">
          <p className="font-cairo text-sm font-black text-navy">
            {formatEgpWithCurrency(item.amountSent, locale)} →{' '}
            {formatEgpWithCurrency(item.amountReceived, locale)}
          </p>
          <p className="mt-1 font-tajawal text-xs text-red-700">
            {item.responseNote || t('accountant.noTransferNote')}
          </p>
        </div>
      ) : (
        <p className="font-cairo text-sm font-black text-navy">
          {formatEgpWithCurrency(
            item.settledAmount ?? item.amountReceived ?? item.amountSent,
            locale,
          )}
        </p>
      )}
    </div>
  );
}

function PayoutCard({ t }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const clientRequest = useClientRequestId();
  const [create, state] = useCreateTransferMutation();

  async function submit(event) {
    event.preventDefault();
    let value;
    try {
      value = toPiasters(amount);
    } catch {
      return;
    }
    if (!Number.isInteger(value) || value <= 0) return;
    try {
      await create({
        amount: value,
        note: note.trim() || undefined,
        clientRequestId: clientRequest.id,
      }).unwrap();
      clientRequest.regenerate();
      setAmount('');
      setNote('');
    } catch {
      // Error rendered below.
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-navy/10 bg-court/[0.05] px-5 py-5 sm:px-6">
        <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
          {t('accountant.payoutEyebrow')}
        </p>
        <h2 className="mt-1 font-cairo text-xl font-black text-navy">
          {t('accountant.payoutTitle')}
        </h2>
        <p className="mt-1 font-tajawal text-sm leading-7 text-navy/60">
          {t('accountant.payoutDescription')}
        </p>
      </div>
      <form
        className="grid gap-4 p-5 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-end sm:p-6"
        onSubmit={submit}
      >
        <MoneyInput
          label={t('accountant.payoutAmount')}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Input
          label={t('common.noteOptional')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('accountant.payoutNotePlaceholder')}
        />
        <Button type="submit" loading={state.isLoading}>
          {t('accountant.sendPayout')}
        </Button>
      </form>
      {state.error && (
        <p className="px-5 pb-5 font-tajawal text-sm text-red-700 sm:px-6" role="alert">
          {errorMessage(state.error, t)}
        </p>
      )}
    </Card>
  );
}
