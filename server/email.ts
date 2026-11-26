/**
 * Optional transactional email through the Resend HTTP API (no extra npm
 * dependency). When it is not configured we never pretend an email was sent:
 * the caller reports emailConfigured=false to the client.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appBaseUrl(): string {
  const configured = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!emailConfigured()) return { sent: false, reason: 'email_not_configured' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      console.error('[email] provider responded with status', response.status);
      return { sent: false, reason: 'email_provider_error' };
    }
    return { sent: true };
  } catch {
    console.error('[email] delivery request failed');
    return { sent: false, reason: 'email_network_error' };
  }
}
