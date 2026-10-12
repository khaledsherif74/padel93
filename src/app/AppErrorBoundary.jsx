import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, ShieldAlert } from 'lucide-react';
import Button from '../shared/ui/Button';
import Card from '../shared/ui/Card';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep technical details in the browser console only. The UI shows a safe, localized message.
    console.error('PADEL 93 render error', error, info);
  }

  reset = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onReset={this.reset} />;
  }
}

function ErrorFallback({ onReset }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-navy">
      <Card className="w-full max-w-lg p-7 sm:p-9">
        <div className="flex size-12 items-center justify-center rounded-full border border-edge/30 text-edge">
          <ShieldAlert className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-cairo text-2xl font-black text-navy sm:text-3xl">
          {t('errors.unexpectedTitle')}
        </h1>
        <p className="mt-3 font-tajawal text-sm leading-7 text-navy/65" role="alert">
          {t('errors.unexpectedDescription')}
        </p>
        <Button className="mt-6" onClick={onReset}>
          <RefreshCcw className="size-4" aria-hidden="true" />
          {t('errors.reloadApp')}
        </Button>
      </Card>
    </div>
  );
}

export default AppErrorBoundary;
