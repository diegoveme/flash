const LOCALE = 'en-US';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function toTime(iso) {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}

/**
 * "June 3, 2026" by default. Returns an empty string for invalid dates.
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDate(iso, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  const time = toTime(iso);
  if (time === null) return '';
  return new Intl.DateTimeFormat(LOCALE, options).format(time);
}

/** "Jun 3, 10:42 AM" */
export function formatDateTime(iso) {
  return formatDate(iso, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "Jun 2026" */
export function formatMonthYear(iso) {
  return formatDate(iso, { month: 'short', year: 'numeric' });
}

/**
 * "Just now", "5m ago", "3h ago", "2d ago".
 * @param {string} iso
 * @param {number} now  Epoch milliseconds (injected to keep this pure).
 */
export function formatTimeAgo(iso, now) {
  const time = toTime(iso);
  if (time === null) return '';
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

/**
 * Whole days left until a date, rounded up and never negative.
 * @param {string} iso
 * @param {number} now
 */
export function daysUntil(iso, now) {
  const time = toTime(iso);
  if (time === null) return 0;
  return Math.max(0, Math.ceil((time - now) / DAY));
}

/**
 * Full years between a YYYY-MM-DD birth date and "today" (both in local time).
 * Returns null for invalid input. Used only for client-side hints; the API decides.
 * @param {string} birthDate
 * @param {Date} today
 */
export function ageOn(birthDate, today) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Latest birth date (YYYY-MM-DD) that satisfies a minimum age on "today".
 * @param {number} minAge
 * @param {Date} today
 */
export function latestBirthDateFor(minAge, today) {
  const year = String(today.getFullYear() - minAge).padStart(4, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
