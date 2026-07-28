'use server'

import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export async function registerUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const username = formData.get('username') as string
  const city = (formData.get('city') as string) || ''
  const petName = formData.get('petName') as string
  const petType = formData.get('petType') as string
  const petBreed = formData.get('petBreed') as string

  // Kontrola povinných polí (město je volitelné)
  if (
    !email ||
    !password ||
    !firstName ||
    !lastName ||
    !username ||
    !petName ||
    !petType ||
    !petBreed
  ) {
    redirect('/register?error=Vyplňte+prosím+všechna+povinná+pole!')
  }

  const supabase = await createClient()

  // 1. Registrace účtu v Supabase Auth
  const { error: signUpError } = await supabase.auth.signUp({
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

  if (signUpError) {
    redirect(`/register?error=${encodeURIComponent(signUpError.message)}`)
  }

  // 2. Okamžité přihlášení a vytvoření cookies relace
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    redirect('/login?message=Účet+vytvořen!+Přihlaste+se+prosím.')
  }

  // 3. Přesměrování rovnou do aplikace
  redirect('/domu')
}