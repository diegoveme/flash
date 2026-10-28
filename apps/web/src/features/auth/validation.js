import {
  EMAIL_MAX_LENGTH,
  MIN_SIGNUP_AGE,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@flash/shared';
import { ageOn } from '../../lib/format/date.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password rule shared by sign up and reset. Returns an error message or null.
 * @param {string} password
 */
export function passwordError(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Use at most ${PASSWORD_MAX_BYTES} bytes (shorter password or fewer special characters).`;
  }
  return null;
}

/**
 * Client-side checks for the sign-up form. They mirror the API rules to give
 * instant feedback; the API validates everything again.
 *
 * @param {{ username: string, email: string, birthDate: string, password: string }} values
 * @param {Date} today
 * @returns {Record<string, string>} field -> message (empty when valid)
 */
export function validateSignUp({ username, email, birthDate, password }, today) {
  const errors = {};

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    errors.username = `Use ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Use only lowercase letters, numbers, "_" or ".".';
  }

  const trimmedEmail = email.trim();
  if (!EMAIL_PATTERN.test(trimmedEmail) || trimmedEmail.length > EMAIL_MAX_LENGTH) {
    errors.email = 'Enter a valid email address.';
  }

  const age = ageOn(birthDate, today);
  if (age === null) {
    errors.birthDate = 'Enter your date of birth.';
  } else if (age < MIN_SIGNUP_AGE) {
    errors.birthDate = `You must be at least ${MIN_SIGNUP_AGE} years old to join.`;
  }

  const passwordProblem = passwordError(password);
  if (passwordProblem) errors.password = passwordProblem;

  return errors;
}
