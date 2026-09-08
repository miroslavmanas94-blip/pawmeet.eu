import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Chybí RESEND_API_KEY v .env.local' },
        { status: 500 }
      )
    }

    const { email, message } = await request.json()

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Vyplňte prosím e-mail i zprávu.' },
        { status: 400 }
      )
    }

    const { data, error } = await resend.emails.send({
      from: 'PawMeet Web <onboarding@resend.dev>',
      to: ['pawmeet.eu@gmail.com'], // Fyzický příjemce zprávy
      replyTo: email,               // Stisknutím "Odpovědět" v e-mailu píšete přímo návštěvníkovi
      subject: `[info@pawmeet.eu] Nová zpráva od ${email}`,
      text: `Tato zpráva byla odeslána z formuláře na webu (určeno pro info@pawmeet.eu).\n\nOdesílatel: ${email}\n\nZpráva:\n${message}`,
    })

    if (error) {
      console.error('Chyba z Resend API:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Chyba serveru:', err)
    return NextResponse.json(
      { error: err.message || 'Chyba při odesílání.' },
      { status: 500 }
    )
  }
}