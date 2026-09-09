import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
})

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json()
    const origin = req.headers.get('origin') || 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}