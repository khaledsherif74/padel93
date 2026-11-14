import { api } from '../../app/api';
import { getApiError } from '../../shared/lib/apiError';
import { offlineStore } from '../../shared/lib/offlineStore';

function toResult(error) {
  const { code, message, details } = getApiError(error);
  return {
    status: typeof error?.status === 'number' ? error.status : 0,
    error: { code, message, details },
  };
}

export async function sendEntry(entry, dispatch) {
  let { photoId } = entry;
  if (entry.photo && !photoId) {
    const form = new FormData();
    form.append('file', entry.photo, 'selfie.jpg');
    const up = await dispatch(api.endpoints.uploadAttendancePhoto.initiate(form));
    if (up.error) return toResult(up.error);
    photoId = up.data.id;
    await offlineStore.update(entry.id, { photoId });
  }
  const body = { clientRequestId: entry.id, ...entry.payload, occurredAt: entry.createdAt };
  if (photoId) body.photoId = photoId;
  const res = await dispatch(api.endpoints.attendanceClock.initiate({ action: entry.kind, body }));
  if (res.error) return toResult(res.error);
  return { status: 200 };
}
