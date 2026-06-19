// src/lib/mail.ts
// Transactional email via Nodemailer/SMTP.
// Transport is lazily created on first call so importing this module never
// requires SMTP to be configured (safe for tests and non-email code paths).
// If SMTP_URL is absent/empty at send time, the function logs a warning and
// returns without throwing — SMTP is optional in the current deployment.

import nodemailer from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  html: string
}

let _transport: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransport() {
  const url = process.env.SMTP_URL
  if (!url) return null
  // Memoize transport across calls within the same process.
  if (!_transport) {
    _transport = nodemailer.createTransport(url)
  }
  return _transport
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransport()
  if (!transport) {
    console.warn('[mail] SMTP_URL not set — skipping email to', message.to)
    return
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? '',
    ...message,
  })
}
