export function normalizePosition(pos) {
  const c = pos?.coords;
  if (
    !c ||
    !Number.isFinite(c.latitude) ||
    !Number.isFinite(c.longitude) ||
    !Number.isFinite(c.accuracy)
  )
    return null;
  return { lat: c.latitude, lng: c.longitude, accuracyM: Math.round(c.accuracy * 10) / 10 };
}

const ERROR_KEYS = {
  1: 'attendance.geoDenied',
  2: 'attendance.geoUnavailable',
  3: 'attendance.geoTimeout',
};
export const geoErrorKey = (error) => ERROR_KEYS[error?.code] ?? 'attendance.geoUnknown';

export function getCurrentPosition({ timeout = 20_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 2 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const out = normalizePosition(pos);
        if (out) resolve(out);
        else reject({ code: 2 });
      },
      reject,
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}
