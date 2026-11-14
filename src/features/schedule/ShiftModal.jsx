import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateShiftMutation,
  useDeleteShiftMutation,
  useUpdateShiftMutation,
} from '../../app/api';
import { errorMessage } from '../../shared/lib/apiError';
import Button from '../../shared/ui/Button';
import Input from '../../shared/ui/Input';
import Modal from '../../shared/ui/Modal';
import Select from '../../shared/ui/Select';

export default function ShiftModal({ shift, staff, dates, locale, onClose }) {
  const { t } = useTranslation();
  const editing = Boolean(shift.id);
  const [create, createState] = useCreateShiftMutation();
  const [update, updateState] = useUpdateShiftMutation();
  const [remove, removeState] = useDeleteShiftMutation();
  const [userId, setUserId] = useState(shift.userId);
  const [date, setDate] = useState(shift.date);
  const [startTime, setStartTime] = useState(shift.startTime ?? '16:00');
  const [endTime, setEndTime] = useState(shift.endTime ?? '04:00');
  const [notes, setNotes] = useState(shift.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const error = createState.error || updateState.error || removeState.error;
  const valid = Boolean(userId && date && startTime && endTime && startTime !== endTime);

  async function submit(event) {
    event.preventDefault();
    if (!valid) return;
    try {
      if (editing)
        await update({
          id: shift.id,
          body: { date, startTime, endTime, notes: notes.trim() || null },
        }).unwrap();
      else
        await create({
          userId,
          date,
          startTime,
          endTime,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }).unwrap();
      onClose();
    } catch {
      // Shown below the form.
    }
  }

  async function doDelete() {
    try {
      await remove(shift.id).unwrap();
      onClose();
    } catch {
      setConfirmDelete(false);
    }
  }

  const dayLabel = (d) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${d}T00:00:00Z`));

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('attendance.editShift') : t('attendance.addShift')}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Select
          label={t('attendance.person')}
          value={userId}
          disabled={editing}
          onChange={(e) => setUserId(e.target.value)}
          options={staff.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          label={t('attendance.day')}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          options={dates.map((d) => ({ value: d, label: dayLabel(d) }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('attendance.startTime')}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label={t('attendance.endTime')}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <Input
          label={t('attendance.notes')}
          value={notes}
          maxLength={200}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(error, t)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editing ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="font-tajawal text-sm text-red-800">
                  {t('attendance.confirmDelete')}
                </span>
                <Button
                  variant="secondary"
                  className="min-h-10 px-3 py-2"
                  loading={removeState.isLoading}
                  onClick={doDelete}
                >
                  {t('attendance.deleteShift')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="text-red-800"
                onClick={() => setConfirmDelete(true)}
              >
                {t('attendance.deleteShift')}
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('attendance.cancel')}
            </Button>
            <Button
              type="submit"
              loading={createState.isLoading || updateState.isLoading}
              disabled={!valid}
            >
              {t('attendance.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
