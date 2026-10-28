import {
  EMAIL_MAX_LENGTH,
  MIN_SIGNUP_AGE,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  countCharacters,
} from '@flash/shared';
import { ConflictError, ValidationError } from '../lib/errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** @param {unknown} value */
export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** @param {unknown} value */
export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Parses a calendar date (YYYY-MM-DD) and rejects impossible dates like 2023-02-30.
 * @param {unknown} value
 * @returns {{ year: number, month: number, day: number } | null}
 */
export function parseCalendarDate(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * Full years between a birth date and a reference day (UTC).
 * @param {{ year: number, month: number, day: number }} birth
 * @param {Date} today
 */
export function ageOn(birth, today) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  const hadBirthday = month > birth.month || (month === birth.month && day >= birth.day);
  return year - birth.year - (hadBirthday ? 0 : 1);
}

/**
 * @param {unknown} password
 * @returns {string | null} error message or null when valid
 */
export function passwordProblem(password) {
  if (typeof password !== 'string' || countCharacters(password) < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Use at most ${PASSWORD_MAX_BYTES} bytes.`;
  }
  return null;
}

/**
 * Validates sign-up input and returns normalized values.
 * @param {Record<string, unknown>} input
 * @param {Date} now
 */
export function validateRegistration(input, now) {
  const fields = {};
  const email = normalizeEmail(input?.email);
  const username = normalizeUsername(input?.username);
  const birth = parseCalendarDate(input?.birthDate);
  const password = input?.password;

  if (!EMAIL_PATTERN.test(email) || email.length > EMAIL_MAX_LENGTH) {
    fields.email = 'Enter a valid email address.';
  }

  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH ||
    !USERNAME_PATTERN.test(username)
  ) {
    fields.username = `Use ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: lowercase letters, numbers, "_" or ".".`;
  }

  if (!birth) {
    fields.birthDate = 'Enter a valid date (YYYY-MM-DD).';
  } else if (ageOn(birth, now) < MIN_SIGNUP_AGE) {
    fields.birthDate = `You must be at least ${MIN_SIGNUP_AGE} years old.`;
  }

  const problem = passwordProblem(password);
  if (problem) fields.password = problem;

  if (Object.keys(fields).length > 0) {
    throw new ValidationError('Check the highlighted fields.', fields);
  }

  return { email, username, birthDate: input.birthDate, password };
}

/**
 * Error for a sign-up that collides with existing accounts.
 * @param {{ username: boolean, email: boolean }} taken
 */
export function registrationConflict(taken) {
  const fields = {};
  if (taken.username) fields.username = 'This username is taken.';
  if (taken.email) fields.email = 'This email is already registered.';
  return new ConflictError('Some details are already in use.', fields);
}

/**
 * The only user data that can leave the server in public responses.
 * @param {{ id: string, username: string, createdAt: string }} user
 */
export function toPublicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}
