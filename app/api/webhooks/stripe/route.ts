import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('Stripe webhook is missing required server configuration.')
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })

  const stripe = new Stripe(secretKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed.')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const updateProfile = async (userId: string, values: Record<string, unknown>) => {
    const { error } = await supabaseAdmin.from('profiles').update(values).eq('id', userId)
    if (error) {
      console.error('Premium entitlement update failed:', error.message)
      throw new Error('Could not update Premium entitlement.')
    }
  }

  const settleLessonPayment = async (session: Stripe.Checkout.Session) => {
    const reservationId = session.metadata?.reservationId
    const userId = session.metadata?.userId
    if (session.mode !== 'payment' || session.metadata?.kind !== 'lesson_reservation' || session.payment_status !== 'paid' || !reservationId || !userId) return
    const { data: reservation, error: reservationError } = await supabaseAdmin.from('reservations')
      .select('id,student_id,status,price_minor,currency,payment_reference')
      .eq('id', reservationId).maybeSingle()
    if (reservationError) throw reservationError
    const amountMatches = !!reservation && reservation.student_id === userId
      && Number(reservation.price_minor) === Number(session.amount_total)
      && String(reservation.currency).toLowerCase() === String(session.currency).toLowerCase()
    if (!amountMatches || (reservation!.status !== 'payment_pending' && !(reservation!.status === 'paid' && reservation!.payment_reference === session.id))) {
      if (session.payment_intent) {
        try {
          await stripe.refunds.create({ payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id, metadata: { reason: 'reservation_validation_failed', reservationId } })
        } catch (refundError) {
          console.error('Automatic refund for invalid lesson payment failed:', refundError)
          throw refundError
        }
      }
      if (reservation && reservation.student_id === userId && reservation.status !== 'paid') {
        const { error } = await supabaseAdmin.from('reservations').update({ status: 'refunded', payment_reference: session.id }).eq('id', reservation.id)
        if (error) throw error
      }
      return
    }
    if (reservation.status === 'paid' && reservation.payment_reference === session.id) return
    const { error } = await supabaseAdmin.from('reservations').update({
      status: 'paid',
      payment_reference: session.id,
      checkout_expires_at: null,
    }).eq('id', reservation.id).eq('status', 'payment_pending')
    if (error) throw error
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id || session.metadata?.userId
      // Never grant Premium for an unpaid or incomplete checkout.
      if (userId && session.mode === 'subscription' && session.payment_status === 'paid' && session.subscription) {
        await updateProfile(userId, {
          is_premium: true,
          premium_status: 'active',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
        })
      } else if (session.mode === 'payment' && session.metadata?.kind === 'lesson_reservation') {
        await settleLessonPayment(session)
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      await settleLessonPayment(event.data.object as Stripe.Checkout.Session)
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const active = event.type !== 'customer.subscription.deleted' && (subscription.status === 'active' || subscription.status === 'trialing')
      const userId = subscription.metadata?.userId
      const values = {
        is_premium: active,
        premium_status: event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        premium_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      }
      if (userId) await updateProfile(userId, values)
      else {
        const { error } = await supabaseAdmin.from('profiles').update(values).eq('stripe_subscription_id', subscription.id)
        if (error) throw new Error('Could not sync subscription status.')
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : invoice.parent?.subscription_details?.subscription?.id
      if (subscriptionId) {
        const { error } = await supabaseAdmin.from('profiles').update({ is_premium: false, premium_status: 'past_due' }).eq('stripe_subscription_id', subscriptionId)
        if (error) throw new Error('Could not mark subscription past due.')
      }
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
