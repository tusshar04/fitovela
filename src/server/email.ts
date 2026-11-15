// Plan delivery is by email, through Amazon SES (the same account tarot uses).
// With no provider configured, development writes every message to .data/outbox/
// so the content can be checked, and production sends nothing.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SUPPORT_EMAIL } from '@/domain/company';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

const accessKeyId = () => process.env.AWS_SES_ACCESS_KEY_ID;
const secretAccessKey = () => process.env.AWS_SES_SECRET_ACCESS_KEY;

export function emailConfigured(): boolean {
  return process.env.EMAIL_PROVIDER === 'ses' && Boolean(accessKeyId() && secretAccessKey());
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM || `Fitovela <${SUPPORT_EMAIL}>`;
}

async function sendWithSes(mail: OutgoingEmail): Promise<void> {
  const { SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2');
  const client = new SESv2Client({
    region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-south-1',
    credentials: { accessKeyId: accessKeyId()!, secretAccessKey: secretAccessKey()! },
    // One attempt only: a retry after a timeout could send the same email twice.
    maxAttempts: 1,
  });
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: emailFrom(),
      Destination: { ToAddresses: [mail.to] },
      ReplyToAddresses: [process.env.EMAIL_REPLY_TO || SUPPORT_EMAIL],
      Content: { Simple: { Subject: { Data: mail.subject, Charset: 'UTF-8' }, Body: { Text: { Data: mail.text, Charset: 'UTF-8' } } } },
      ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET || undefined,
    }),
  );
}

/** Never throws: a failed email must not undo a paid order. The plan is on screen and reachable by login. */
export async function sendEmail(mail: OutgoingEmail): Promise<{ delivered: boolean }> {
  if (emailConfigured()) {
    try {
      await sendWithSes(mail);
      return { delivered: true };
    } catch (err) {
      console.error(`email failed: ${mail.subject}: ${(err as Error).name}: ${(err as Error).message}`);
      return { delivered: false };
    }
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(`email not sent (no provider): ${mail.subject}`);
    return { delivered: false };
  }
  const dir = path.join(process.cwd(), '.data', 'outbox');
  await fs.mkdir(dir, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(dir, name), JSON.stringify({ ...mail, from: emailFrom(), at: new Date().toISOString() }, null, 2));
  console.log(`[dev] email to ${mail.to} written to .data/outbox/${name}`);
  return { delivered: false };
}
