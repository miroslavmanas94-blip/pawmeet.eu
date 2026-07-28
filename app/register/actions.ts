'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const username = formData.get('username') as string
  const city = formData.get('city') as string
  const petName = formData.get('petName') as string
  const petType = formData.get('petType') as string
  const petBreed = formData.get('petBreed') as string

  const supabase = await createClient()

  // 1. Registrace v Supabase Auth (Supabase automaticky pošle e-mail s kódovým tokenem)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        username: username,
        city: city,
        pet_name: petName,
        pet_type: petType,
        pet_breed: petBreed,
      },
    },
  })

  if (authError) {
    redirect(`/register?error=${encodeURIComponent(authError.message)}`)
  }

  // 2. Přesměrování na zadání ověřovacího kódu
  redirect(`/verify-email?email=${encodeURIComponent(email)}`)
}