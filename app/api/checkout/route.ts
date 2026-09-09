import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey || secretKey.startsWith('sk_test_tvuj')) {
      return NextResponse.json(
        { error: 'Chybí platný STRIPE_SECRET_KEY v .env.local' },
        { status: 400 }
      )
    }

    // Parametr apiVersion byl odebrán – TypeScript je nyní spokojený
    const stripe = new Stripe(secretKey)

    const body = await req.json().catch(() => ({}))
    const { plan, userId, email } = body

    const priceAmount = plan === 'yearly' ? 89900 : 9900
    const interval = plan === 'yearly' ? 'year' : 'month'
    const origin = req.headers.get('origin') || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'czk',
            product_data: {
              name: `PawMeet Premium (${plan === 'yearly' ? 'Roční' : 'Měsíční'})`,
              description: 'Plný přístup k prémiovým funkcím PawMeet',
              tax_code: 'txcd_10000000',
            },
            unit_amount: priceAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/profile?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
    }

    if (email && typeof email === 'string' && email.includes('@')) {
      sessionParams.customer_email = email
    }

    if (userId) {
      sessionParams.client_reference_id = userId
      sessionParams.metadata = { userId }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('DETAILNÍ CHYBA STRIPE:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Chyba při vytváření platby' },
      { status: 400 }
    )
  }
}