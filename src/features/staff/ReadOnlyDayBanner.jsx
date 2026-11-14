import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateStaffDateAccessRequestMutation } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import Button from '../../shared/ui/Button';

export default function ReadOnlyDayBanner({ date }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const [createRequest, state] = useCreateStaffDateAccessRequestMutation();

  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 5) return;
    try {
      await createRequest({ businessDate: date, reason: reason.trim(), kind: 'EDIT' }).unwrap();
      setSent(true);
      setOpen(false);
    } catch {
      // The error is rendered under the form.
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-navy/10 bg-navy/[0.03] p-3">
      <p className="font-tajawal text-sm text-navy/65">{t('staff.readOnlyDay')}</p>
      {sent ? (
        <p className="font-tajawal text-sm text-emerald-800">{t('staff.requestSent')}</p>
      ) : !open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {t('staff.requestEditAccess')}
        </Button>
      ) : (
        <form className="space-y-2" onSubmit={submit}>
          <textarea
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('staff.accessRequestReason')}
            className="w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-sm text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
          />
          {state.error && (
            <p className="font-tajawal text-sm text-red-700" role="alert">
              {errorMessage(state.error, t)}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={state.isLoading} disabled={reason.trim().length < 5}>
              {t('staff.sendRequest')}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
