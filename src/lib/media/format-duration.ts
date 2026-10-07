export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = String(safeSeconds % 60).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}
