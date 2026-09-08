import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Vynutí dynamické zpracování (Next.js kód nebude předgenerovávat během buildu)
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // 1. Načtení proměnných prostředí uvnitř funkce
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // 2. Bezpečnostní kontrola - pokud klíče chybí, vrátí chybu až při volání API, ne při buildu
  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !webhookSecret) {
    console.error('Chybí některé z požadovaných proměnných prostředí.')
    return NextResponse.json(
      { error: 'Serverová konfigurace není kompletní.' },
      { status: 500 }
    )
  }

  // 3. Inicializace klientů až v momentě přijetí požadavku
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2025-02-24' as any,
  })

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // 4. Zpracování samotného Webhooku
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Chybí stripe-signature v hlavičce požadavku.' },
      { status: 400 }
    )
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      const customerEmail = session.customer_details?.email

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId)
      } else if (customerEmail) {
        await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('email', customerEmail)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook verification failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}