import { NotFoundError, ValidationError } from './errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resource ids in the path. A malformed id can not exist, so it is a 404.
 * @param {unknown} value
 */
export function pathId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new NotFoundError();
  return value.toLowerCase();
}

/**
 * Ids sent in a body. A malformed id is a validation problem.
 * @param {unknown} value
 * @param {string} field
 */
export function bodyId(value, field) {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new ValidationError(`Invalid ${field}.`, { [field]: `Invalid ${field}.` });
  }
  return value.toLowerCase();
}
