import { queues } from '@/lib/queue'

/**
 * Best-effort transactional email enqueue. The mail worker no-ops when SMTP_URL
 * is unset, so this is safe to call regardless of email configuration. Never
 * throws into the caller.
 */
export async function queueEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) return
  try {
    await queues.mail.add('mail', { to, subject, html })
  } catch (err) {
    console.warn('[notify-email] enqueue failed (best-effort):', err)
  }
}
