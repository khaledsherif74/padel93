import Button from './Button';

export default function LoadMore({ hasMore, loading, onClick, label }) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="ghost" loading={loading} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}
