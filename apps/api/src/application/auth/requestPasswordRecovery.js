import { PASSWORD_RESET_TTL_MINUTES } from '@flash/shared';
import { normalizeEmail } from '../../domain/users.js';
import { ValidationError } from '../../lib/errors.js';
import { hashToken, newToken } from '../../lib/ids.js';

export const RECOVERY_MESSAGE =
  'If the email is registered, you will receive a link to reset your password.';

const TTL_SECONDS = PASSWORD_RESET_TTL_MINUTES * 60;

function recoveryEmail(link) {
  const text = [
    'Someone asked to reset the password of your Flash account.',
    '',
    `Open this link within ${PASSWORD_RESET_TTL_MINUTES} minutes to choose a new password:`,
    link,
    '',
    'The link works only once. If you did not ask for this, you can ignore this email.',
  ].join('\n');
  const html = `<p>Someone asked to reset the password of your Flash account.</p>
<p>Open this link within ${PASSWORD_RESET_TTL_MINUTES} minutes to choose a new password:</p>
<p><a href="${link}">Reset my password</a></p>
<p>The link works only once. If you did not ask for this, you can ignore this email.</p>`;
  return { subject: 'Reset your Flash password', text, html };
}

export function createRequestPasswordRecovery({ users, passwordResets, mailer, config, logger }) {
  /**
   * Same response whether or not the email exists, so the endpoint can not
   * be used to discover accounts. Delivery failures are logged, not returned.
   * @param {{ email?: unknown }} input
   */
  return async function requestPasswordRecovery(input) {
    const email = normalizeEmail(input?.email);
    if (!email || !email.includes('@')) {
      throw new ValidationError('Enter a valid email address.', {
        email: 'Enter a valid email address.',
      });
    }

    const user = await users.findByEmail(email);
    if (user) {
      try {
        const token = newToken();
        await passwordResets.save(hashToken(token), user.id, TTL_SECONDS);
        const link = `${config.http.appBaseUrl}/auth/reset?token=${encodeURIComponent(token)}`;
        await mailer.send({ to: user.email, ...recoveryEmail(link) });
      } catch (error) {
        logger.error('Password recovery delivery failed', { userId: user.id, error });
      }
    }

    return { message: RECOVERY_MESSAGE };
  };
}
