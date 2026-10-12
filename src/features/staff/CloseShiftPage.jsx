import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCloseShiftMutation, useGetCurrentShiftsQuery } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { useClientRequestId } from '../../shared/lib/clientRequestId';
import { formatEgpWithCurrency, toPiasters } from '../../shared/lib/money';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Button from '../../shared/ui/Button';
import MoneyInput from '../../shared/ui/MoneyInput';
import Input from '../../shared/ui/Input';
import Badge from '../../shared/ui/Badge';

export default function CloseShiftPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const current = useGetCurrentShiftsQuery();
  const [closeShift, state] = useCloseShiftMutation();
  const clientRequest = useClientRequestId();
  const [countedCash, setCountedCash] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const shift = current.data?.items?.find((item) => item.id === id) ?? current.data?.items?.[0];

  async function submit(event) {
    event.preventDefault();

    let counted;
    try {
      counted = toPiasters(countedCash);
    } catch {
      return;
    }

    try {
      const response = await closeShift({
        id: shift.id,
        body: {
          countedCash: counted,
          ...(note.trim() ? { note: note.trim() } : {}),
          clientRequestId: clientRequest.id,
        },
      }).unwrap();
      clientRequest.regenerate();
      setResult(response);
    } catch {
      // Error is shown below.
    }
  }

  if (!result && !shift && !current.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-7 text-center text-navy">
          <AlertTriangle className="mx-auto size-7 text-red-700" aria-hidden="true" />
          <h1 className="mt-4 font-cairo text-2xl font-black text-navy">
            {t('staff.noOpenShift')}
          </h1>
          <p className="mt-2 font-tajawal text-sm leading-7 text-navy/60">
            {t('staff.noOpenShiftHint')}
          </p>
          <Link to="/app" className="mt-5 inline-block">
            <Button>{t('common.backHome')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (result) {
    const variance = result.shift?.variance ?? 0;
    const unresolved = result.unresolved ?? [];
    const positive = variance > 0;

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow={t('staff.shiftResult')}
          title={t('staff.shiftClosed')}
          description={t('staff.shiftResultDescription')}
        />

        <Card dark className="border-navy bg-navy p-7 text-white shadow-card-dark">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone={variance === 0 ? 'success' : positive ? 'warning' : 'danger'}>
                {variance === 0
                  ? t('staff.balanced')
                  : positive
                    ? t('staff.over')
                    : t('staff.short')}
              </Badge>
              <h2 className="mt-4 font-cairo text-4xl font-black">
                {variance === 0
                  ? t('staff.noVariance')
                  : `${positive ? '+' : '−'}${formatEgpWithCurrency(Math.abs(variance), locale)}`}
              </h2>
              <p className="mt-2 font-tajawal text-sm leading-7 text-white/65">
                {variance === 0 ? t('staff.shiftBalancedHint') : t('staff.shiftVarianceHint')}
              </p>
            </div>

            <div className="flex size-20 items-center justify-center rounded-full border border-ball text-ball">
              {variance === 0 ? (
                <CheckCircle2 className="size-9" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-9" aria-hidden="true" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-cairo text-xs font-semibold text-navy/50">
                {t('staff.countedCash')}
              </p>
              <p className="mt-1 font-cairo text-xl font-black">
                {formatEgpWithCurrency(result.shift.countedCash, locale)}
              </p>
            </div>
            <div>
              <p className="font-cairo text-xs font-semibold text-navy/50">
                {t('staff.systemVariance')}
              </p>
              <p className="mt-1 font-cairo text-xl font-black">
                {variance === 0
                  ? t('staff.none')
                  : formatEgpWithCurrency(Math.abs(variance), locale)}
              </p>
            </div>
          </div>
        </Card>

        {unresolved.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-ball text-ball">
                <CircleDollarSign className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-cairo text-lg font-extrabold">
                  {t('staff.unresolvedBookings')}
                </h2>
                <p className="mt-1 font-tajawal text-sm text-navy/55">
                  {t('staff.unresolvedHint')}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {unresolved.map((item) => (
                <Link
                  key={item.appointmentId}
                  to={`/app/staff/appointments/${item.appointmentId}`}
                  className="block rounded-xl border border-navy/8 p-4 hover:border-edge/30"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-cairo text-sm font-bold">
                          {item.court || t('staff.court')}
                        </p>
                        {item.flagStatus === 'REJECTED' && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-cairo text-[10px] font-bold text-red-800">
                            {t('paymentFlagStatus.REJECTED')}
                          </span>
                        )}
                        {item.flagStatus === 'PENDING' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-cairo text-[10px] font-bold text-amber-800">
                            {t('paymentFlagStatus.PENDING')}
                          </span>
                        )}
                      </div>
                      {item.flagStatus === 'REJECTED' && item.decisionNote && (
                        <p className="mt-1 font-tajawal text-xs text-red-800">
                          {item.decisionNote}
                        </p>
                      )}
                    </div>
                    <p className="font-cairo text-sm font-black">
                      {formatEgpWithCurrency(item.due, locale)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <Link to="/app">
          <Button variant="secondary" className="w-full sm:w-auto">
            {t('common.backHome')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow={t('staff.shiftClose')}
        title={t('staff.closeShift')}
        description={t('staff.blindCountDescription')}
        actions={
          <Link to="/app">
            <Button variant="ghost">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t('common.back')}
            </Button>
          </Link>
        }
      />

      <Card dark className="border-navy bg-night p-6 text-white shadow-card-dark sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ball text-ball">
            <CircleDollarSign className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-cairo text-xl font-black">{t('staff.countYourDrawer')}</h2>
            <p className="mt-2 font-tajawal text-sm leading-7 text-white/65">
              {t('staff.blindCountWarning')}
            </p>
          </div>
        </div>
      </Card>

      <form className="mt-5 space-y-5" onSubmit={submit}>
        <Card className="p-6">
          <MoneyInput
            label={t('staff.countedCash')}
            placeholder="0.00"
            value={countedCash}
            onChange={(event) => setCountedCash(event.target.value)}
            autoFocus
            required
          />
          <p className="mt-1.5 font-tajawal text-xs text-navy/55">{t('staff.countedCashHint')}</p>
          <div className="mt-3 rounded-xl bg-ball/10 px-4 py-3 font-tajawal text-xs leading-6 text-navy">
            {t('staff.countEntryOnly')}
          </div>
          <div className="mt-4">
            <Input
              label={t('common.noteOptional')}
              placeholder={t('staff.closeNotePlaceholder')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </Card>

        {state.error && (
          <Card className="border-red-200 bg-red-50 p-5">
            <p className="font-tajawal text-sm leading-7 text-red-800" role="alert">
              {errorMessage(state.error, t)}
            </p>
          </Card>
        )}

        <Button type="submit" className="w-full" loading={state.isLoading}>
          {t('staff.confirmClose')}
        </Button>
      </form>
    </div>
  );
}
