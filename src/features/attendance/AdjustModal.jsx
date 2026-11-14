import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdjustAttendanceMutation } from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import { fromInputValue, toInputValue } from '../../shared/lib/cairoInput';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Modal from '../../shared/ui/Modal';

export default function AdjustModal({ record, onClose }) {
  const { t } = useTranslation();
  const [adjust, state] = useAdjustAttendanceMutation();
  const startIn = toInputValue(record.clockInAt);
  const startOut = toInputValue(record.clockOutAt);
  const [clockIn, setClockIn] = useState(startIn);
  const [clockOut, setClockOut] = useState(startOut);
  const [reason, setReason] = useState('');

  const changedIn = clockIn !== startIn;
  const changedOut = clockOut !== startOut && clockOut !== '';
  const valid = reason.trim().length >= 3 && (changedIn || changedOut);

  async function submit(event) {
    event.preventDefault();
    if (!valid) return;
    const body = { reason: reason.trim() };
    if (changedIn) body.clockInAt = fromInputValue(clockIn);
    if (changedOut) body.clockOutAt = fromInputValue(clockOut);
    try {
      await adjust({ id: record.id, body }).unwrap();
      onClose();
    } catch {
      // Shown below the form.
    }
  }

  return (
    <Modal open onClose={onClose} title={t('attendance.adjustTitle')}>
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label={t('attendance.clockInAt')}
          type="datetime-local"
          value={clockIn}
          onChange={(e) => setClockIn(e.target.value)}
        />
        <Input
          label={t('attendance.clockOutAt')}
          type="datetime-local"
          value={clockOut}
          onChange={(e) => setClockOut(e.target.value)}
        />
        <label className="block">
          <span className="mb-2 block font-cairo text-sm font-semibold text-navy">
            {t('attendance.reason')}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-navy/10 bg-white px-4 py-3 font-tajawal text-base text-navy outline-none focus:border-edge focus:ring-2 focus:ring-edge/15"
          />
          <span className="mt-1.5 block font-tajawal text-xs text-navy/55">
            {t('attendance.reasonHint')}
          </span>
        </label>
        {state.error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(state.error, t)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('attendance.cancel')}
          </Button>
          <Button type="submit" loading={state.isLoading} disabled={!valid}>
            {t('attendance.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
