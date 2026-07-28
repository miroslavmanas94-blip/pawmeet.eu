'use server'

import { createClient } from '../../utils/supabase/server'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function registerUser(formData: FormData): Promise<void> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Majitel
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const username = formData.get('username') as string
  const ownerBirthDate = formData.get('ownerBirthDate') as string
  const city = formData.get('city') as string
  const bio = formData.get('bio') as string

  // Mazlíček
  const petName = formData.get('petName') as string
  const petType = formData.get('petType') as string // 'pes' | 'kocka'
  const petBreed = formData.get('petBreed') as string
  const petBirthDate = formData.get('petBirthDate') as string
  const petGender = formData.get('petGender') as string
  const petSize = formData.get('petSize') as string
  const petTemperament = formData.get('petTemperament') as string
  const petActivities = (formData.get('petActivities') as string)?.split(',').map(a => a.trim()) || []

  const supabase = await createClient()

  // 1. Vytvoření uživatele v Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    redirect(`/register?error=${encodeURIComponent(authError?.message || 'Chyba při registraci')}`)
  }

  const userId = authData.user.id

  // 2. Uložení majitele do public.profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    username: username,
    birth_date: ownerBirthDate || null,
    city: city,
    bio: bio,
  })

  if (profileError) {
    redirect(`/register?error=${encodeURIComponent('Chyba profilu: ' + profileError.message)}`)
  }

  // 3. Uložení mazlíčka do public.pets
  const { error: petError } = await supabase.from('pets').insert({
    owner_id: userId,
    name: petName,
    type: petType,
    breed: petBreed,
    birth_date: petBirthDate || null,
    gender: petGender,
    size: petSize,
    temperament: petTemperament,
    favorite_activities: petActivities,
  })

  if (petError) {
    redirect(`/register?error=${encodeURIComponent('Chyba mazlíčka: ' + petError.message)}`)
  }

  // 4. Uvítací e-mail přes Resend
  try {
    await resend.emails.send({
      from: 'PawMeet <onboarding@resend.dev>',
      to: email,
      subject: 'Vítejte v PawMeet! 🐾',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #6366F1;">Vítejte v rodině PawMeet, ${firstName}!</h1>
          <p>Jsme nadšení, že jste se k nám přidali i s vaším mazlíčkem <strong>${petName}</strong>.</p>
          <p>Váš účet je připraven. Můžete se pustit do objevování okolí a nových přátel!</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('Chyba e-mailu:', err)
  }

  redirect('/domu')
}