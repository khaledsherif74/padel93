import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useSetGoalMutation } from '../../app/api';
import { selectPermissions } from '../auth/authSelectors';
import { errorMessage } from '../../shared/lib/apiError';
import Button from '../../shared/ui/Button';
import Card from '../../shared/ui/Card';
import Input from '../../shared/ui/Input';

export default function GoalSetter({ month, current }) {
  const { t } = useTranslation();
  const permissions = useSelector(selectPermissions);
  const [setGoal, state] = useSetGoalMutation();
  const [hours, setHours] = useState('');
  const [saved, setSaved] = useState(false);

  if (permissions?.['goal.set'] === false) return null;
  const value = Number(hours);
  const valid = Number.isFinite(value) && value > 0 && value <= 3000;

  async function submit(event) {
    event.preventDefault();
    if (!valid) return;
    setSaved(false);
    try {
      await setGoal({ month, goalHours: value }).unwrap();
      setSaved(true);
      setHours('');
    } catch {
      // The error is shown below the form.
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <form className="space-y-3" onSubmit={submit}>
        <h2 className="font-cairo text-base font-extrabold text-navy">
          {t('accountant.setGoalTitle')}
        </h2>
        <Input
          label={t('accountant.goalHoursLabel')}
          type="number"
          min="1"
          max="3000"
          step="0.5"
          inputMode="decimal"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          placeholder={current != null ? String(current) : ''}
        />
        {state.error && (
          <p className="font-tajawal text-sm text-red-700" role="alert">
            {errorMessage(state.error, t)}
          </p>
        )}
        {saved && (
          <p className="font-tajawal text-sm text-emerald-800">{t('accountant.goalSaved')}</p>
        )}
        <Button type="submit" loading={state.isLoading} disabled={!valid}>
          {t('accountant.saveGoal')}
        </Button>
      </form>
    </Card>
  );
}
