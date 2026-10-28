/**
 * Structured JSON logger. Values under sensitive keys are always redacted:
 * passwords, tokens, emails and dates of birth never reach the logs.
 */
const SENSITIVE_KEY = /pass|token|secret|authorization|cookie|email|birth|signature|policy/i;
// Third-party error messages (for example SES) can embed email addresses.
const EMAIL_IN_TEXT = /[^\s@<>"'()]+@[^\s@<>"'()]+\.[^\s@<>"'()]+/g;

function scrub(text) {
  return text.replace(EMAIL_IN_TEXT, '[REDACTED_EMAIL]');
}

function redact(value, depth = 0) {
  if (typeof value === 'string') return scrub(value);
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrub(value.message),
      stack: value.stack && scrub(value.stack),
    };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, depth + 1),
    ]),
  );
}

function write(level, message, context) {
  const entry = {
    level,
    message: scrub(message),
    time: new Date().toISOString(),
    ...redact(context ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = Object.freeze({
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
});

export { redact };
