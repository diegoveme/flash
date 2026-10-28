/** Turns raw EXIF numbers into the short labels shown in the UI. */

const METERING_MODES = {
  0: 'Unknown',
  1: 'Average',
  2: 'Center-weighted',
  3: 'Spot',
  4: 'Multi-spot',
  5: 'Pattern',
  6: 'Partial',
  255: 'Other',
};

const isPositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const oneDecimal = (value) => value.toFixed(1).replace(/\.0$/, '');

export function formatAperture(value) {
  return isPositive(value) ? `f/${oneDecimal(value)}` : undefined;
}

export function formatShutterSpeed(value) {
  if (!isPositive(value)) return undefined;
  return value >= 1 ? `${oneDecimal(value)}s` : `1/${Math.round(1 / value)}s`;
}

export function formatFocalLength(value) {
  return isPositive(value) ? `${oneDecimal(value)}mm` : undefined;
}

export function formatIso(value) {
  return isPositive(value) ? String(Math.round(value)) : undefined;
}

export function formatExposureBias(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '0 EV';
  return `${rounded > 0 ? '+' : ''}${oneDecimal(rounded)} EV`;
}

export function formatMeteringMode(value) {
  return Number.isInteger(value) ? METERING_MODES[value] : undefined;
}

export function formatFlash(value) {
  if (!Number.isInteger(value)) return undefined;
  return value & 1 ? 'Fired' : 'Did not fire';
}

/** "2024:05:01 14:03:22" becomes "2024-05-01 14:03:22". */
export function formatDateTaken(value) {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match;
  if (year === '0000') return undefined;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
