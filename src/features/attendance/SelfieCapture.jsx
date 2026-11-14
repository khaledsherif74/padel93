import { Camera, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fitWithin } from '../../shared/lib/imageFit';
import Button from '../../shared/ui/Button';
import Modal from '../../shared/ui/Modal';

const MAX_SIDE = 720;
const JPEG_QUALITY = 0.72;

export default function SelfieCapture({ open, onCapture, onCancel }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [shot, setShot] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError(null);
    setShot(null);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('cameraUnavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError(
          err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
            ? 'cameraDenied'
            : 'cameraUnavailable',
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => () => shot && URL.revokeObjectURL(shot.url), [shot]);

  function capture() {
    const video = videoRef.current;
    const size = video && fitWithin(video.videoWidth, video.videoHeight, MAX_SIDE);
    if (!size) return;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d').drawImage(video, 0, 0, size.width, size.height);
    canvas.toBlob(
      (blob) => {
        if (blob) setShot({ blob, url: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  }

  return (
    <Modal open={open} onClose={onCancel} title={t('attendance.selfieTitle')}>
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl bg-red-50 p-4 font-tajawal text-sm text-red-800" role="alert">
            {t(`attendance.${error}`)}
          </p>
        ) : (
          <>
            <p className="font-tajawal text-sm text-navy/65">{t('attendance.selfieHint')}</p>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl bg-navy/90">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`size-full object-cover [transform:scaleX(-1)] ${shot ? 'hidden' : ''}`}
              />
              {shot && (
                <img
                  src={shot.url}
                  alt=""
                  className="size-full object-cover [transform:scaleX(-1)]"
                />
              )}
            </div>
          </>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>
            {t('attendance.cancel')}
          </Button>
          {!error && !shot && (
            <Button onClick={capture}>
              <Camera className="size-4" aria-hidden="true" />
              {t('attendance.capture')}
            </Button>
          )}
          {shot && (
            <>
              <Button variant="ghost" onClick={() => setShot(null)}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                {t('attendance.retake')}
              </Button>
              <Button onClick={() => onCapture(shot.blob)}>{t('attendance.usePhoto')}</Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
