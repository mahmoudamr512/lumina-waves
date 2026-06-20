// tests/unit/mail.test.ts
import { vi, beforeEach } from 'vitest'

const mockSendMail = vi.fn(async () => ({ messageId: 'x' }))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

import { sendMail } from '@/lib/mail'

beforeEach(() => {
  vi.clearAllMocks()
  mockSendMail.mockResolvedValue({ messageId: 'x' })
})

test('sends through SMTP transport with correct recipient', async () => {
  process.env.SMTP_URL = 'smtp://user:pass@localhost:587'
  process.env.MAIL_FROM = 'ops@luminawaves.com'
  await sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' })
  expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }))
})

test('includes subject and html in transport call', async () => {
  process.env.SMTP_URL = 'smtp://user:pass@localhost:587'
  process.env.MAIL_FROM = 'ops@luminawaves.com'
  await sendMail({ to: 'x@y.com', subject: 'Test Subject', html: '<b>body</b>' })
  expect(mockSendMail).toHaveBeenCalledWith(
    expect.objectContaining({ subject: 'Test Subject', html: '<b>body</b>' }),
  )
})

test('no-ops and does not throw when SMTP_URL is empty', async () => {
  const saved = process.env.SMTP_URL
  process.env.SMTP_URL = ''
  await expect(sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p/>' })).resolves.toBeUndefined()
  expect(mockSendMail).not.toHaveBeenCalled()
  process.env.SMTP_URL = saved
})

test('no-ops and does not throw when SMTP_URL is unset', async () => {
  const saved = process.env.SMTP_URL
  delete process.env.SMTP_URL
  await expect(sendMail({ to: 'a@b.com', subject: 'Hi', html: '<p/>' })).resolves.toBeUndefined()
  expect(mockSendMail).not.toHaveBeenCalled()
  process.env.SMTP_URL = saved
})
