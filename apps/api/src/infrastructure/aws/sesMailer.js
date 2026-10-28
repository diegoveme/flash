import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

/**
 * Sends email through Amazon SES. In the SES sandbox only verified
 * recipients receive mail.
 * @param {{ region: string, fromAddress: string }} options
 * @returns {import('../../application/ports.js').Mailer}
 */
export function createSesMailer({ region, fromAddress }) {
  const client = new SESv2Client({ region });

  return {
    async send({ to, subject, text, html }) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: fromAddress,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: {
                Text: { Data: text, Charset: 'UTF-8' },
                Html: { Data: html, Charset: 'UTF-8' },
              },
            },
          },
        }),
      );
    },
  };
}
