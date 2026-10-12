import { Inbox } from 'lucide-react';
import Card from './Card';

export default function EmptyState({ title, description, action }) {
  return (
    <Card className="p-8 text-center text-navy">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-ball text-ball">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-cairo text-lg font-bold text-navy">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md font-tajawal text-sm leading-6 text-navy/60">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
