import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY není nastaven v prostředí.' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24' as any,
    })

    const { plan, userId } = await req.json()

    const priceId =
      plan === 'yearly'
        ? process.env.STRIPE_YEARLY_PRICE_ID
        : process.env.STRIPE_MONTHLY_PRICE_ID

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID není nakonfigurováno.' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/profile?payment=success`,
      cancel_url: `${req.headers.get('origin')}/premium?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}