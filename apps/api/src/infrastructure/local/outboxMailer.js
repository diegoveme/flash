import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local stand-in for SES: each email is written as an .eml file in `dir`
 * (git-ignored). The log line names the file only, never the recipient or
 * the token in the link.
 * @returns {import('../../application/ports.js').Mailer}
 */
export function createOutboxMailer({ dir, clock, logger }) {
  return {
    async send({ to, subject, text }) {
      await mkdir(dir, { recursive: true });
      const stamp = clock.now().toISOString().replace(/[:.]/g, '-');
      const file = path.join(dir, `${stamp}-${randomUUID().slice(0, 8)}.eml`);
      const content = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
      ].join('\r\n');
      await writeFile(file, content, 'utf8');
      logger.info('Email written to the local outbox', {
        file: path.relative(process.cwd(), file),
      });
    },
  };
}
