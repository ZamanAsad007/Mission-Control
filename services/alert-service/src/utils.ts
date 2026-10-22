/**
 * Formats a Date or ISO date string into a clean, human-readable UTC string.
 * Example: "2026-10-20T00:00:00.000Z" -> "Oct 20, 2026, 00:00 UTC"
 * Example: "2026-10-25" -> "Oct 25, 2026"
 */
export function formatAlertDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'N/A';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    // If date-only string like YYYY-MM-DD
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }

    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = d.getUTCSeconds();

    const timePart =
      seconds > 0
        ? `${hours}:${minutes}:${String(seconds).padStart(2, '0')}`
        : `${hours}:${minutes}`;

    return `${datePart}, ${timePart} UTC`;
  } catch {
    return String(dateInput);
  }
}
