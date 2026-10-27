import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!secretKey || !supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Platby nejsou správně nakonfigurovány.' }, { status: 503 })
    }

    const authorization = req.headers.get('authorization') || ''
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!accessToken) {
      return NextResponse.json({ error: 'Pro aktivaci Premium se nejprve přihlas.' }, { status: 401 })
    }
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se znovu.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'monthly' ? 'monthly' : null
    if (!plan) return NextResponse.json({ error: 'Vyber měsíční nebo roční tarif.' }, { status: 400 })

    const stripe = new Stripe(secretKey)
    const origin = new URL(req.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'czk',
          product_data: { name: `PawMeet Mega haf Premium — ${plan === 'yearly' ? 'roční' : 'měsíční'}` },
          unit_amount: plan === 'yearly' ? 44900 : 4900,
          recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit platbu. Zkus to prosím znovu.' }, { status: 500 })
  }
}
