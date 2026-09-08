import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24' as any,
})

// Supabase klient s backend právy pro úpravu profilu
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id
      const customerEmail = session.customer_details?.email

      // Aktualizace uživatele v Supabase
      if (userId) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId)

        if (error) console.error('Chyba při aktualizaci Supabase podle ID:', error)
      } else if (customerEmail) {
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('email', customerEmail)

        if (error) console.error('Chyba při aktualizaci Supabase podle e-mailu:', error)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook verification failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}