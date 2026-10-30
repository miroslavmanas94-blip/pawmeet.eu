import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Správa předplatného není momentálně nakonfigurovaná.' },
      { status: 503 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nejdřív se přihlas.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: 'Účet se nepodařilo ověřit.' }, { status: 503 })
    }

    const customerId = profile?.stripe_customer_id
    if (!customerId) {
      return NextResponse.json(
        { error: 'K tomuto účtu zatím není přiřazené aktivní předplatné.' },
        { status: 409 }
      )
    }

    const stripe = new Stripe(secretKey)
    const origin = new URL(req.url).origin
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: new URL('/profile', origin).toString(),
    })

    return NextResponse.json({ url: portalSession.url })
  } catch {
    return NextResponse.json(
      { error: 'Správu předplatného se nepodařilo otevřít. Zkus to prosím později.' },
      { status: 502 }
    )
  }
}
