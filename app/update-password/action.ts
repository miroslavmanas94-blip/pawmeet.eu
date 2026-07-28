'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePasswordAction(formData: FormData): Promise<void> {
  const password = formData.get('password') as string

  if (!password || password.length < 6) {
    redirect('/update-password?error=Heslo+musí+mít+alespoň+6+znaků')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    redirect(`/update-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/login?message=Heslo+bylo+úspěšně+změněno!+Můžete+se+přihlásit.')
}