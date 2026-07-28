'use server'

import { createClient } from '../../utils/supabase/server'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const username = formData.get('username') as string
  const city = formData.get('city') as string

  const supabase = createClient()

  // 1. Registrace uživatele v Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Chyba při registraci' }
  }

  const userId = authData.user.id

  // 2. Uložení rozšířeného profilu do tabulky profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    username: username,
    city: city,
  })

  if (profileError) {
    return { error: profileError.message }
  }

  // 3. Odeslání e-mailu přes Resend
  try {
    await resend.emails.send({
      from: 'PawMeet <onboarding@resend.dev>', // V produkci vlastní doména
      to: email,
      subject: 'Vítejte v PawMeet! 🐾',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #4F46E5;">Vítejte v PawMeet, ${firstName}!</h1>
          <p>Děkujeme za registraci do světové sociální sítě pro milovníky psů a koček.</p>
          <p>Váš účet byl úspěšně vytvořen. Nyní se můžete přihlásit a přidat svého prvního mazlíčka.</p>
          <br/>
          <p>Tým PawMeet</p>
        </div>
      `,
    })
  } catch (emailError) {
    console.error('Chyba při odesílání e-mailu:', emailError)
  }

  redirect('/domu')
}