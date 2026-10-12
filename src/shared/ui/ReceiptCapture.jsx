import { Camera, ImagePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Card from './Card';
import { useUploadReceiptMutation } from '../../app/api';
import { errorMessage } from '../lib/apiError';

const MAX_BYTES = 6 * 1024 * 1024;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function isHeic(file) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function compressImage(file) {
  if (isHeic(file)) return file;

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();

    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));

    if (!blob) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReceiptCapture({ value, onUploaded, onClear, label, disabled = false }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [uploadReceipt, uploadState] = useUploadReceiptMutation();

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setValidationError('');

    const mime = file.type || '';
    if (!MIME_TYPES.has(mime) && !isHeic(file)) {
      setValidationError(t('receipt.invalidType'));
      return;
    }

    if (file.size > MAX_BYTES) {
      setValidationError(t('receipt.tooLarge'));
      return;
    }

    try {
      const prepared = await compressImage(file);
      if (prepared.size > MAX_BYTES) {
        setValidationError(t('receipt.tooLargeAfterCompression'));
        return;
      }

      if (preview?.url) URL.revokeObjectURL(preview.url);
      const url = URL.createObjectURL(prepared);
      setPreview({ file: prepared, url });
    } catch {
      setValidationError(t('receipt.couldNotRead'));
    }
  }

  async function upload() {
    if (!preview?.file) return;

    const formData = new FormData();
    formData.append('file', preview.file);

    try {
      const result = await uploadReceipt(formData).unwrap();
      onUploaded?.(result.id);
    } catch {
      // Mutation error is rendered below.
    }
  }

  function clear() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setValidationError('');
    onClear?.();
  }

  const error = validationError || (uploadState.error ? errorMessage(uploadState.error, t) : '');

  return (
    <Card className="border-dashed p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-cairo text-sm font-semibold text-navy">
            {label || t('receipt.title')}
          </p>
          <p className="mt-1 font-tajawal text-xs leading-6 text-navy/55">{t('receipt.hint')}</p>
        </div>

        {!preview && !value && (
          <div className="flex gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-navy px-4 py-3 font-cairo text-sm font-bold text-white transition hover:bg-court focus-within:ring-2 focus-within:ring-edge">
              <Camera className="size-4" aria-hidden="true" />
              <span>{t('receipt.camera')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="environment"
                className="sr-only"
                onChange={handleFile}
                disabled={disabled}
              />
            </label>

            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-navy/10 px-4 py-3 font-cairo text-sm font-bold text-navy transition hover:bg-navy/5 focus-within:ring-2 focus-within:ring-edge">
              <ImagePlus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('receipt.gallery')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                onChange={handleFile}
                disabled={disabled}
              />
            </label>
          </div>
        )}
      </div>

      {preview && !value && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
          <img
            src={preview.url}
            alt={t('receipt.preview')}
            className="h-28 w-full rounded-xl border border-navy/10 object-cover sm:w-28"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button loading={uploadState.isLoading} onClick={upload} disabled={disabled}>
              {t('receipt.attach')}
            </Button>
            <Button variant="ghost" onClick={clear} disabled={uploadState.isLoading}>
              <X className="size-4" aria-hidden="true" />
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {value && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-ball/10 px-4 py-3">
          <div>
            <p className="font-cairo text-sm font-bold text-navy">{t('receipt.attached')}</p>
            <p className="mt-1 font-tajawal text-xs text-navy/55">{value}</p>
          </div>
          <Button variant="ghost" onClick={clear} disabled={disabled} className="px-3">
            <X className="size-4" aria-hidden="true" />
            {t('receipt.remove')}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-3 font-tajawal text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
