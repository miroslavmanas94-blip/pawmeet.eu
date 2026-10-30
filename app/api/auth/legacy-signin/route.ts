import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

function isRateLimited(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (current.count >= MAX_ATTEMPTS) return true
  current.count += 1
  return false
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown'

  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !email.includes('@') || !password || password.length > 1024) {
    return NextResponse.json({ error: 'E-mail nebo heslo nejsou správné.' }, { status: 400 })
  }
  if (isRateLimited(ip + ':' + email)) {
    return NextResponse.json({ error: 'Příliš mnoho pokusů. Počkej chvíli a zkus to znovu.' }, { status: 429 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Přihlášení není momentálně nakonfigurované.' }, { status: 503 })
  }
  if (!serviceKey) {
    return NextResponse.json({ error: 'E-mail nebo heslo nejsou správné.' }, { status: 401 })
  }

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const candidates: string[] = []
    for (let page = 1; page <= 10 && candidates.length < 5; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      if (error) return NextResponse.json({ error: 'Přihlášení se nepodařilo ověřit.' }, { status: 503 })
      for (const user of data.users) {
        const metadata = user.user_metadata || {}
        const originalEmail = typeof metadata.original_email === 'string' ? metadata.original_email.trim().toLowerCase() : ''
        if (originalEmail === email && user.email && user.email.toLowerCase() !== email && !candidates.includes(user.email)) {
          candidates.push(user.email)
          if (candidates.length >= 5) break
        }
      }
      if (data.users.length < 100) break
    }

    for (const candidateEmail of candidates) {
      const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await auth.auth.signInWithPassword({ email: candidateEmail, password })
      if (!error && data.session) {
        return NextResponse.json({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }
    }

    return NextResponse.json({ error: 'E-mail nebo heslo nejsou správné.' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Přihlášení se nepodařilo dokončit. Zkus to prosím později.' }, { status: 502 })
  }
}
