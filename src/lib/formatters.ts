/**
 * Formats a duration in seconds into a human-readable string.
 * Example: 45 -> "45s", 75 -> "1m 15s", 3665 -> "1h 1m 5s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s';
  if (seconds === 0) return '0s';

  const units = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 864000 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
    { label: 's', seconds: 1 },
  ];

  let remainingSeconds = seconds;
  const parts: string[] = [];

  for (const unit of units) {
    const value = Math.floor(remainingSeconds / unit.seconds);
    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      remainingSeconds %= unit.seconds;
    }
  }

  return parts.slice(0, 2).join(' ') || '0s';
}
