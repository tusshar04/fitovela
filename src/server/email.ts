// Plan delivery is by email. No provider is connected yet: in development every
// message is written to .data/outbox/ so the content can be checked.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.EMAIL_PROVIDER);
}

export async function sendEmail(mail: OutgoingEmail): Promise<{ delivered: boolean }> {
  if (emailConfigured()) {
    // TODO(launch): send through the chosen provider (tarot uses AWS SES).
    console.warn('EMAIL_PROVIDER is set but no sender is implemented yet');
    return { delivered: false };
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(`email not sent (no provider): ${mail.subject}`);
    return { delivered: false };
  }
  const dir = path.join(process.cwd(), '.data', 'outbox');
  await fs.mkdir(dir, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(dir, name), JSON.stringify({ ...mail, at: new Date().toISOString() }, null, 2));
  console.log(`[dev] email to ${mail.to} written to .data/outbox/${name}`);
  return { delivered: false };
}
