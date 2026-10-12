import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Card from './Card';

export default function ErrorState({ title, description, onRetry }) {
  const { t } = useTranslation();

  return (
    <Card className="p-6" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-cairo text-base font-bold text-navy">{title || t('errors.generic')}</h3>
          {description && <p className="mt-1 font-tajawal text-sm leading-6 text-navy/60">{description}</p>}
          {onRetry && (
            <Button variant="ghost" className="mt-4 px-0" onClick={onRetry}>
              <RefreshCcw className="size-4" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
