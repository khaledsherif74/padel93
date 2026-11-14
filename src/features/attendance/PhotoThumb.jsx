import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetAttendancePhotoQuery } from '../../app/api';
import Modal from '../../shared/ui/Modal';
import Skeleton from '../../shared/ui/Skeleton';

export default function PhotoThumb({ photoId, label }) {
  const { t } = useTranslation();
  const photo = useGetAttendancePhotoQuery(photoId, { skip: !photoId });
  const [url, setUrl] = useState(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!photo.data) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(photo.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo.data]);

  if (!photoId) return null;
  if (photo.isLoading) return <Skeleton className="size-20 rounded-xl" />;
  if (photo.isError || !url) {
    const gone = photo.error?.status === 410;
    return (
      <div className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl bg-navy/[0.04] p-1 text-center">
        <ImageOff className="size-5 text-navy/35" aria-hidden="true" />
        <span className="font-tajawal text-[10px] leading-tight text-navy/55">
          {gone ? t('attendance.selfieGone') : t('attendance.selfieUnavailable')}
        </span>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-edge"
        aria-label={label}
      >
        <img src={url} alt={label} className="size-20 rounded-xl object-cover" />
      </button>
      <Modal open={zoom} onClose={() => setZoom(false)} title={label}>
        <img src={url} alt={label} className="mx-auto max-h-[70vh] rounded-2xl" />
      </Modal>
    </>
  );
}
