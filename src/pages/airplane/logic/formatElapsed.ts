export function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec.toFixed(2)}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s.toFixed(2)}초`;
}
