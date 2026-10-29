import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server není nakonfigurován.' }, { status: 503 })
  }

  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Přihlášení je povinné.' }, { status: 401 })

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user } } = await authClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Přihlášení vypršelo.' }, { status: 401 })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Schvalovat komunity může pouze administrátor.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  if (typeof body.groupId !== 'string' || !['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const { data: group, error: loadError } = await admin
    .from('groups')
    .select('id, approval_status, group_type')
    .eq('id', body.groupId)
    .eq('approval_status', 'pending')
    .maybeSingle()
  if (loadError || !group) {
    return NextResponse.json({ error: 'Tato žádost už nečeká na schválení.' }, { status: 404 })
  }

  const status = body.action === 'approve' ? 'approved' : 'rejected'
  const { error: updateError } = await admin.from('groups').update({
    approval_status: status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', group.id)

  if (updateError) return NextResponse.json({ error: 'Stav komunity se nepodařilo uložit.' }, { status: 500 })
  return NextResponse.json({ success: true, status })
}
