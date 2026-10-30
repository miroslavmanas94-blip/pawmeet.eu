import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const requestedNext = url.searchParams.get('next') || '/domu'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/domu'
  const destination = new URL(next, url.origin)

  if (!code) {
    const login = new URL('/login', url.origin)
    login.searchParams.set('reason', 'confirmation')
    return NextResponse.redirect(login)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const login = new URL('/login', url.origin)
    login.searchParams.set('reason', 'confirmation')
    return NextResponse.redirect(login)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const pendingPet = user?.user_metadata?.pending_pet_profile
  if (user && pendingPet && typeof pendingPet === 'object') {
    try {
      const { data: existingPets } = await supabase.from('pets').select('id').eq('user_id', user.id).limit(1)
      if (!existingPets?.length) {
        const { error: petError } = await supabase.from('pets').insert({ ...pendingPet, user_id: user.id })
        if (!petError) await supabase.auth.updateUser({ data: { pending_pet_profile: null } })
      } else {
        await supabase.auth.updateUser({ data: { pending_pet_profile: null } })
      }
    } catch {
      // Leave the pending pet metadata in place so it can be retried after login.
    }
  }

  return NextResponse.redirect(destination)
}
