'use server'


import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'


export async function updatePasswordAction(formData: FormData) {
  const code = formData.get('code') as string
  const newPassword = formData.get('password') as string
  const userEmail = formData.get('email') as string


  const supabase = await createClient()


  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: userEmail,
    token: code,
    type: 'recovery',
  })


  if (verifyError) {
    redirect(`/reset-password?email=${encodeURIComponent(userEmail)}&error=Neplatný+nebo+expirovaný+kód`)
  }


  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })


  if (updateError) {
    redirect(`/reset-password?email=${encodeURIComponent(userEmail)}&error=${encodeURIComponent(updateError.message)}`)
  }


  redirect('/login?message=Heslo+bylo+úspěšně+změněno.+Můžete+se+přihlásit.')
}