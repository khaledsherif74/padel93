import { Check, FileImage, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIncomesQuery, useGetReceiptFileQuery, useVerifyIncomeMutation } from '../../app/api';
import { formatDateTime } from '../../shared/lib/date';
import { formatEgpWithCurrency } from '../../shared/lib/money';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function VerificationQueuePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const query = useGetIncomesQuery({ verification: 'PENDING', limit: 50 });
  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(
    () => query.data?.items?.find((item) => item.id === selectedId) ?? null,
    [query.data, selectedId],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t('accountant.verificationEyebrow')}
        title={t('accountant.verificationTitle')}
        description={t('accountant.verificationDescription')}
        actions={
          <Button variant="ghost" onClick={query.refetch}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(query.error, t)}
          onRetry={query.refetch}
        />
      ) : (query.data?.items?.length ?? 0) === 0 ? (
        <EmptyState
          title={t('accountant.verificationEmpty')}
          description={t('accountant.verificationEmptyHint')}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
          <div className="space-y-3">
            {query.data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-4 text-start outline-none transition ${selectedId === item.id ? 'border-edge bg-court/[0.035] shadow-card' : 'border-navy/10 bg-white hover:border-edge/35'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{t('verification.PENDING')}</Badge>
                      <span className="font-cairo text-sm font-bold text-navy">
                        {t(`method.${item.method}`)}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-tajawal text-sm text-navy/65">
                      {item.recordedBy?.name ?? t('common.unavailable')}
                    </p>
                    <p className="mt-1 font-tajawal text-xs text-navy/45">
                      {formatDateTime(item.recordedAt, locale)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-cairo text-lg font-black text-navy">
                      {formatEgpWithCurrency(item.amount, locale)}
                    </p>
                    <p className="mt-1 font-tajawal text-xs text-navy/45">
                      {item.reference || '—'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <VerificationPanel item={selected} locale={locale} />
        </div>
      )}
    </div>
  );
}

function VerificationPanel({ item, locale }) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [verify, state] = useVerifyIncomeMutation();
  const receipt = useGetReceiptFileQuery(item?.receiptId, { skip: !item?.receiptId });

  useEffect(() => {
    setDecision(null);
    setNote('');
  }, [item?.id]);

  if (!item) {
    return (
      <Card className="flex min-h-[360px] items-center justify-center p-8 text-center">
        <div>
          <FileImage className="mx-auto size-8 text-ball" aria-hidden="true" />
          <h2 className="mt-4 font-cairo text-xl font-black text-navy">
            {t('accountant.selectPayment')}
          </h2>
          <p className="mt-2 max-w-sm font-tajawal text-sm leading-7 text-navy/55">
            {t('accountant.selectPaymentHint')}
          </p>
        </div>
      </Card>
    );
  }

  const canReject = decision === 'REJECTED' && !note.trim();

  async function submit() {
    if (!decision || canReject) return;
    try {
      await verify({
        id: item.id,
        decision,
        note: note.trim() || undefined,
      }).unwrap();
      setDecision(null);
      setNote('');
    } catch {
      // API error rendered below.
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-navy/10 bg-navy px-5 py-5 text-white sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-cairo text-xs font-bold uppercase tracking-[0.14em] text-ball">
              {t('accountant.reviewPayment')}
            </p>
            <h2 className="mt-1 font-cairo text-xl font-black">{t(`method.${item.method}`)}</h2>
          </div>
          <Badge tone="warning">{t('verification.PENDING')}</Badge>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-navy/10 bg-navy/[0.025]">
          <div className="flex items-center justify-between border-b border-navy/10 px-4 py-3">
            <p className="font-cairo text-sm font-bold text-navy">{t('accountant.receipt')}</p>
            <FileImage className="size-4 text-edge" aria-hidden="true" />
          </div>
          <ReceiptPreview
            data={receipt.data}
            loading={receipt.isLoading}
            error={receipt.error}
            t={t}
          />
        </div>

        <div className="space-y-4">
          <Info label={t('common.amount')} value={formatEgpWithCurrency(item.amount, locale)} />
          <Info label={t('accountant.recordedBy')} value={item.recordedBy?.name ?? '—'} />
          <Info label={t('accountant.reference')} value={item.reference || '—'} />
          <Info
            label={t('accountant.recordedAt')}
            value={formatDateTime(item.recordedAt, locale)}
          />

          <div className="pt-2">
            <label className="mb-2 block font-cairo text-sm font-semibold text-navy">
              {t('accountant.decisionNote')}
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none placeholder:text-navy/35 focus:border-edge focus:ring-2 focus:ring-edge/15"
              placeholder={t('accountant.decisionNotePlaceholder')}
            />
            {decision === 'REJECTED' && !note.trim() && (
              <p className="mt-1.5 font-tajawal text-xs text-red-700">
                {t('accountant.rejectNoteRequired')}
              </p>
            )}
          </div>

          {state.error && (
            <p className="font-tajawal text-sm text-red-700" role="alert">
              {errorMessage(state.error, t)}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className={decision === 'VERIFIED' ? 'ring-2 ring-ball ring-offset-2' : ''}
              disabled={state.isLoading}
              onClick={() => setDecision('VERIFIED')}
            >
              <Check className="size-4" aria-hidden="true" />
              {t('accountant.verify')}
            </Button>
            <Button
              variant="ghost"
              className={
                decision === 'REJECTED' ? 'border border-red-200 bg-red-50 text-red-800' : ''
              }
              disabled={state.isLoading}
              onClick={() => setDecision('REJECTED')}
            >
              <X className="size-4" aria-hidden="true" />
              {t('accountant.reject')}
            </Button>
          </div>

          {decision && (
            <Button
              className="w-full"
              loading={state.isLoading}
              disabled={canReject}
              onClick={submit}
            >
              {decision === 'VERIFIED'
                ? t('accountant.confirmVerification')
                : t('accountant.confirmRejection')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ReceiptPreview({ data, loading, error, t }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!data) {
      setUrl(null);
      return undefined;
    }
    const nextUrl = URL.createObjectURL(data);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [data]);

  if (loading)
    return (
      <div className="p-4">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (error || !url) {
    return (
      <div className="flex min-h-80 items-center justify-center p-6 text-center">
        <div>
          <FileImage className="mx-auto size-7 text-navy/30" aria-hidden="true" />
          <p className="mt-3 font-tajawal text-sm text-navy/55">
            {t('accountant.receiptUnavailable')}
          </p>
        </div>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={t('accountant.receiptPreview')}
      className="min-h-80 w-full object-contain bg-white p-2"
    />
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-navy/10 px-4 py-3">
      <p className="font-cairo text-[11px] font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-tajawal text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
