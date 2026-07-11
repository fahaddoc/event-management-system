import nodemailer, { type Transporter } from 'nodemailer'

export type ConfirmationData = {
  title: string
  date: Date
  time: string
  venue: string
  city: string
  ticketNumber: string
}

export function renderConfirmation(d: ConfirmationData): {
  subject: string
  text: string
  html: string
} {
  const when = new Date(d.date).toDateString()
  const subject = `Registration confirmed: ${d.title}`
  const text =
    `You're registered for ${d.title}.\n\n` +
    `Date: ${when} ${d.time}\n` +
    `Venue: ${d.venue}, ${d.city}\n` +
    `Ticket: ${d.ticketNumber}\n\n` +
    `See you there!`
  const html =
    `<h2>You're registered for ${d.title}</h2>` +
    `<p><b>Date:</b> ${when} ${d.time}<br/>` +
    `<b>Venue:</b> ${d.venue}, ${d.city}<br/>` +
    `<b>Ticket:</b> ${d.ticketNumber}</p>`
  return { subject, text, html }
}

let cachedTransport: Transporter | null = null

async function getTransport(): Promise<Transporter> {
  if (cachedTransport) return cachedTransport
  if (process.env.SMTP_HOST) {
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  } else {
    const test = await nodemailer.createTestAccount()
    cachedTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: test.user, pass: test.pass },
    })
  }
  return cachedTransport
}

export async function sendConfirmationEmail(to: string, data: ConfirmationData): Promise<void> {
  const { subject, text, html } = renderConfirmation(data)
  const transport = await getTransport()
  const info = await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'Events <no-reply@events.test>',
    to,
    subject,
    text,
    html,
  })
  const preview = nodemailer.getTestMessageUrl(info)
  if (preview) console.log(`[email] preview: ${preview}`)
}
