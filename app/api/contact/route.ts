import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Kontaktní e-mail momentálně není nakonfigurován.' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      return NextResponse.json({ error: 'Zadej platný e-mail a zprávu.' }, { status: 400 })
    }
    if (email.length > 254 || message.length > 5000) {
      return NextResponse.json({ error: 'Zpráva je příliš dlouhá.' }, { status: 413 })
    }

    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'PawMeet Web <onboarding@resend.dev>',
      to: ['pawmeet.eu@gmail.com'],
      replyTo: email,
      subject: '[PawMeet] Nová zpráva z kontaktního formuláře',
      text: `Odesílatel: ${email}\n\nZpráva:\n${message}`,
    })
    if (error) {
      console.error('Resend contact error:', error.message)
      return NextResponse.json({ error: 'Zprávu se nepodařilo odeslat. Zkus to později.' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact endpoint failed:', error)
    return NextResponse.json({ error: 'Nastala chyba při odesílání zprávy.' }, { status: 500 })
  }
}
