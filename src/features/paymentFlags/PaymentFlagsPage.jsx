import { AlertTriangle, CheckCircle2, Clock3, X, Check } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRole } from '../auth/authSelectors';
import { useTranslation } from 'react-i18next';
import { useGetPaymentFlagsQuery, useDecidePaymentFlagMutation } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import PageHeader from '../../shared/ui/PageHeader';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import EmptyState from '../../shared/ui/EmptyState';
import ErrorState from '../../shared/ui/ErrorState';
import Skeleton from '../../shared/ui/Skeleton';

export default function PaymentFlagsPage() {
  const { t, i18n } = useTranslation();
  const role = useSelector(selectRole);
  const isOwner = role === 'OWNER';
  const query = useGetPaymentFlagsQuery(
    { limit: 50 },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true },
  );
  const [activeId, setActiveId] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decide, decideState] = useDecidePaymentFlagMutation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  async function submit(event, id, decision) {
    event.preventDefault();
    if (decision === 'REJECTED' && !decisionNote.trim()) return;
    try {
      await decide({
        id,
        decision,
        ...(decisionNote.trim() ? { note: decisionNote.trim() } : {}),
      }).unwrap();
      setActiveId(null);
      setDecisionNote('');
    } catch {
      // Error rendered below.
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={isOwner ? t('owner.eyebrow') : t('staff.eyebrow')}
        title={t('owner.paymentFlags')}
        description={
          isOwner
            ? t('owner.paymentFlagsOwnerDescription')
            : t('owner.paymentFlagsStaffDescription')
        }
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('errors.generic')}
          description={errorMessage(query.error, t)}
          onRetry={query.refetch}
        />
      ) : (query.data?.items ?? []).length === 0 ? (
        <EmptyState title={t('owner.noPaymentFlags')} description={t('owner.noPaymentFlagsHint')} />
      ) : (
        <div className="space-y-3">
          {query.data.items.map((flag) => {
            const pending = flag.status === 'PENDING';
            const approved = flag.status === 'APPROVED';
            const rejected = flag.status === 'REJECTED';
            const resolved = flag.status === 'RESOLVED';
            return (
              <Card key={flag.id} className="overflow-hidden p-0">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          approved ? 'success' : rejected ? 'danger' : resolved ? 'info' : 'warning'
                        }
                      >
                        {pending ? (
                          <Clock3 className="me-1 size-3" aria-hidden="true" />
                        ) : approved ? (
                          <CheckCircle2 className="me-1 size-3" aria-hidden="true" />
                        ) : rejected ? (
                          <X className="me-1 size-3" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="me-1 size-3" aria-hidden="true" />
                        )}
                        {t(`paymentFlagStatus.${flag.status}`)}
                      </Badge>
                      {!resolved && flag.status !== 'APPROVED' && (
                        <Badge tone={rejected ? 'danger' : 'warning'}>
                          <AlertTriangle className="me-1 size-3" aria-hidden="true" />
                          {t('owner.underpaidWarning')}
                        </Badge>
                      )}
                      <Badge tone={flag.origin === 'AUTO_UNDERPAYMENT' ? 'warning' : 'neutral'}>
                        {t(`paymentFlagOrigin.${flag.origin || 'OWNER'}`)}
                      </Badge>
                    </div>
                    <h2 className="mt-3 font-cairo text-lg font-black text-navy">
                      {flag.appointment?.court || t('staff.court')}
                    </h2>
                    <p className="mt-1 font-tajawal text-sm text-navy/60">
                      {flag.appointment?.customer || t('staff.walkIn')}
                    </p>
                    <div className="mt-3 rounded-xl border border-navy/10 bg-navy/[0.02] p-3">
                      <p className="font-cairo text-[10px] font-semibold text-navy/45">
                        {t('owner.paymentFlagNote')}
                      </p>
                      <p className="mt-1 font-tajawal text-sm leading-6 text-navy">{flag.note}</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Value
                        label={t('staff.expected')}
                        value={flag.expectedAmount}
                        locale={locale}
                      />
                      <Value
                        label={t('staff.collected')}
                        value={flag.collectedAmount}
                        locale={locale}
                      />
                      <Value
                        label={t('owner.paymentFlagGap')}
                        value={flag.difference}
                        locale={locale}
                      />
                    </div>
                    {flag.decisionNote && (
                      <div
                        className={`mt-4 rounded-xl border p-4 ${rejected ? 'border-red-200 bg-red-50' : 'border-ball/30 bg-ball/10'}`}
                      >
                        <p className="font-cairo text-xs font-bold text-navy">
                          {t('owner.paymentFlagDecision')}
                        </p>
                        <p className="mt-1 font-tajawal text-sm leading-6 text-navy">
                          {flag.decisionNote}
                        </p>
                      </div>
                    )}
                  </div>
                  {pending && isOwner && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setActiveId(flag.id);
                          setDecisionNote('');
                        }}
                        variant="secondary"
                      >
                        <Check className="size-4" aria-hidden="true" />
                        {t('owner.approve')}
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-800 hover:bg-red-50"
                        onClick={() => {
                          setActiveId(`reject:${flag.id}`);
                          setDecisionNote('');
                        }}
                      >
                        <X className="size-4" aria-hidden="true" />
                        {t('owner.reject')}
                      </Button>
                    </div>
                  )}
                </div>

                {activeId === flag.id && pending && isOwner && (
                  <form
                    className="border-t border-navy/10 bg-navy/[0.02] p-5 sm:p-6"
                    onSubmit={(e) => submit(e, flag.id, 'APPROVED')}
                  >
                    <p className="font-tajawal text-sm leading-6 text-navy/75">
                      {t('owner.approveFlagHint')}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="submit" loading={decideState.isLoading}>
                        <Check className="size-4" aria-hidden="true" />
                        {t('owner.confirmApproval')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setActiveId(null);
                          setDecisionNote('');
                        }}
                        disabled={decideState.isLoading}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                )}

                {activeId === `reject:${flag.id}` && pending && isOwner && (
                  <form
                    className="border-t border-navy/10 bg-red-50/60 p-5 sm:p-6"
                    onSubmit={(e) => submit(e, flag.id, 'REJECTED')}
                  >
                    <p className="font-cairo text-sm font-bold text-red-900">
                      {t('owner.rejectFlagTitle')}
                    </p>
                    <p className="mt-1 font-tajawal text-xs leading-6 text-red-900/75">
                      {t('owner.rejectFlagHint')}
                    </p>
                    <textarea
                      rows={3}
                      className="mt-3 w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
                      placeholder={t('owner.rejectFlagPlaceholder')}
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                    {!decisionNote.trim() && (
                      <p className="mt-1.5 font-tajawal text-xs text-red-700">
                        {t('owner.rejectNoteRequired')}
                      </p>
                    )}
                    {decideState.error && (
                      <p className="mt-3 font-tajawal text-sm text-red-800" role="alert">
                        {errorMessage(decideState.error, t)}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        variant="secondary"
                        loading={decideState.isLoading}
                        disabled={!decisionNote.trim()}
                      >
                        <X className="size-4" aria-hidden="true" />
                        {t('owner.confirmRejection')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setActiveId(null);
                          setDecisionNote('');
                        }}
                        disabled={decideState.isLoading}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Value({ label, value, locale }) {
  return (
    <div className="rounded-xl border border-navy/8 bg-navy/[0.02] p-3">
      <p className="font-cairo text-[10px] font-semibold text-navy/45">{label}</p>
      <p className="mt-1 font-cairo text-sm font-black text-navy">
        {(Number(value ?? 0) / 100).toLocaleString(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{' '}
        EGP
      </p>
    </div>
  );
}
