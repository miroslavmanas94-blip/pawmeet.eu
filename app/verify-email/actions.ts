'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resendVerificationAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    redirect('/verify-email?error=Chybí+e-mailová+adresa')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  })

  if (error) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&message=Ověřovací+e-mail+byl+úspěšně+znovu+odeslán.`)
}