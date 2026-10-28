import { describe, expect, it } from 'bun:test';
import { passwordError, validateSignUp } from './validation.js';

const TODAY = new Date(2026, 9, 27);
const VALID = {
  username: 'clara.soto',
  email: 'clara@example.com',
  birthDate: '1995-02-18',
  password: 'long enough',
};

describe('validateSignUp', () => {
  it('accepts valid values', () => {
    expect(validateSignUp(VALID, TODAY)).toEqual({});
  });

  it('rejects people under the minimum age', () => {
    const errors = validateSignUp({ ...VALID, birthDate: '2008-10-28' }, TODAY);
    expect(errors.birthDate).toContain('18');
  });

  it('accepts someone turning 18 today', () => {
    expect(validateSignUp({ ...VALID, birthDate: '2008-10-27' }, TODAY)).toEqual({});
  });

  it('checks username format and length', () => {
    expect(validateSignUp({ ...VALID, username: 'ab' }, TODAY).username).toBeDefined();
    expect(validateSignUp({ ...VALID, username: 'Clara Soto' }, TODAY).username).toBeDefined();
  });

  it('checks the email', () => {
    expect(validateSignUp({ ...VALID, email: 'not-an-email' }, TODAY).email).toBeDefined();
  });
});

describe('passwordError', () => {
  it('requires 8 characters and at most 72 bytes', () => {
    expect(passwordError('short')).not.toBeNull();
    expect(passwordError('12345678')).toBeNull();
    expect(passwordError('ñ'.repeat(37))).not.toBeNull(); // 74 bytes in UTF-8
  });
});
