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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secretKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Platby lekcí nejsou správně nakonfigurovány.' }, { status: 503 })
    }

    const authorization = req.headers.get('authorization') || ''
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!accessToken) return NextResponse.json({ error: 'Pro platbu se nejprve přihlas.' }, { status: 401 })

    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken)
    if (authError || !user) return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se znovu.' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const reservationId = typeof body.reservationId === 'string' ? body.reservationId : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reservationId)) {
      return NextResponse.json({ error: 'Rezervace není platná.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: reservation, error: reservationError } = await admin
      .from('reservations')
      .select('id,student_id,status,price_minor,currency,title,starts_at,trainer_id,stripe_checkout_session_id')
      .eq('id', reservationId).maybeSingle()
    if (reservationError) throw reservationError
    if (!reservation || reservation.student_id !== user.id) return NextResponse.json({ error: 'Rezervace nebyla nalezena.' }, { status: 404 })
    if (reservation.status !== 'payment_pending' || Number(reservation.price_minor) <= 0) {
      return NextResponse.json({ error: 'Tato rezervace nyní nečeká na platbu.' }, { status: 409 })
    }

    const stripe = new Stripe(secretKey)
    if (reservation.stripe_checkout_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(reservation.stripe_checkout_session_id)
      if (existing.status === 'open' && existing.url) return NextResponse.json({ url: existing.url })
      if (existing.payment_status === 'paid') return NextResponse.json({ error: 'Platba již proběhla. Čeká se na potvrzení rezervace.' }, { status: 409 })
    }

    const origin = new URL(req.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: String(reservation.currency).toLowerCase(),
          product_data: { name: 'PawMeet – ' + reservation.title, description: 'Rezervace tréninkové lekce' },
          unit_amount: Number(reservation.price_minor),
        },
        quantity: 1,
      }],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: { reservationId: reservation.id, userId: user.id, kind: 'lesson_reservation' },
      payment_intent_data: { metadata: { reservationId: reservation.id, userId: user.id, kind: 'lesson_reservation' } },
      success_url: origin + '/reservations?payment=success',
      cancel_url: origin + '/reservations?payment=canceled',
    })

    const { error: updateError } = await admin.from('reservations')
      .update({ stripe_checkout_session_id: session.id, checkout_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null })
      .eq('id', reservation.id).eq('student_id', user.id).eq('status', 'payment_pending')
    if (updateError) {
      try { await stripe.checkout.sessions.expire(session.id) } catch {}
      throw updateError
    }
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe lesson checkout failed:', error)
    return NextResponse.json({ error: 'Bezpečnou platbu se nepodařilo připravit. Zkus to prosím znovu.' }, { status: 500 })
  }
}
