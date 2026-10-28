import { describe, expect, it } from 'bun:test';
import { initialsFor, stableIndex } from './avatar.js';
import { formatBytes } from './bytes.js';
import { ageOn, daysUntil, formatDate, formatTimeAgo, latestBirthDateFor } from './date.js';
import { exifBadges, toExifFormValues, toExifPayload } from './exif.js';

const NOW = Date.parse('2026-10-27T12:00:00.000Z');

describe('date formatters', () => {
  it('formats relative times', () => {
    expect(formatTimeAgo('2026-10-27T11:59:40.000Z', NOW)).toBe('Just now');
    expect(formatTimeAgo('2026-10-27T11:55:00.000Z', NOW)).toBe('5m ago');
    expect(formatTimeAgo('2026-10-27T09:00:00.000Z', NOW)).toBe('3h ago');
    expect(formatTimeAgo('2026-10-25T12:00:00.000Z', NOW)).toBe('2d ago');
    expect(formatTimeAgo('not a date', NOW)).toBe('');
  });

  it('counts days left without going negative', () => {
    expect(daysUntil('2026-11-03T12:00:00.000Z', NOW)).toBe(7);
    expect(daysUntil('2026-10-27T13:00:00.000Z', NOW)).toBe(1);
    expect(daysUntil('2026-10-20T12:00:00.000Z', NOW)).toBe(0);
  });

  it('formats absolute dates in English', () => {
    expect(formatDate('2026-06-03T12:00:00.000Z')).toBe('June 3, 2026');
    expect(formatDate('')).toBe('');
  });

  it('computes age and the latest valid birth date', () => {
    const today = new Date(2026, 9, 27);
    expect(ageOn('2008-10-27', today)).toBe(18);
    expect(ageOn('2008-10-28', today)).toBe(17);
    expect(ageOn('2008/10/28', today)).toBeNull();
    expect(latestBirthDateFor(18, today)).toBe('2008-10-27');
  });
});

describe('formatBytes', () => {
  it('uses B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(4.2 * 1024 * 1024)).toBe('4.2 MB');
    expect(formatBytes(-1)).toBe('');
  });
});

describe('exif helpers', () => {
  it('builds badges with an ISO prefix', () => {
    expect(
      exifBadges({ aperture: 'f/2', shutterSpeed: '1/250s', focalLength: '35mm', iso: '400' }),
    ).toEqual(['f/2', '1/250s', '35mm', 'ISO 400']);
    expect(exifBadges({ iso: 'ISO 100' })).toEqual(['ISO 100']);
    expect(exifBadges(undefined)).toEqual([]);
  });

  it('keeps only whitelisted, non-empty fields in the payload', () => {
    const payload = toExifPayload({
      cameraMake: ' Fujifilm ',
      lens: '',
      gpsLatitude: '40.4168',
      iso: '200',
    });
    expect(payload).toEqual({ cameraMake: 'Fujifilm', iso: '200' });
  });

  it('fills every form field', () => {
    const values = toExifFormValues({ cameraModel: 'X-T5', GPSLongitude: '-3.7' });
    expect(values.cameraModel).toBe('X-T5');
    expect(values.cameraMake).toBe('');
    expect('GPSLongitude' in values).toBe(false);
  });
});

describe('avatar helpers', () => {
  it('derives initials', () => {
    expect(initialsFor('marcus_chen')).toBe('MC');
    expect(initialsFor('elena')).toBe('EL');
    expect(initialsFor('')).toBe('?');
  });

  it('returns a stable index in range', () => {
    const index = stableIndex('clara.soto', 5);
    expect(index).toBe(stableIndex('clara.soto', 5));
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(5);
  });
});
