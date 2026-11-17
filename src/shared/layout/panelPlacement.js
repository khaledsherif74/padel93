export function placePanel({ anchor, viewportWidth, rtl, maxWidth = 390, margin = 12, gap = 10 }) {
  const width = Math.min(maxWidth, Math.max(0, viewportWidth - margin * 2));
  const preferred = rtl ? anchor.left : anchor.right - width;
  const left = Math.min(Math.max(preferred, margin), viewportWidth - width - margin);
  return { top: anchor.bottom + gap, left, width };
}
