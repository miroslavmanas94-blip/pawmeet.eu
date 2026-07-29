'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signupAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const username = formData.get('username') as string
  const birthDate = formData.get('birthDate') as string
  
  const petName = formData.get('petName') as string
  const petType = formData.get('petType') as string
  const petGender = formData.get('petGender') as string
  const petBreed = formData.get('petBreed') as string
  const petBirthDate = formData.get('petBirthDate') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        username,
        birth_date: birthDate,
        pet_name: petName,
        pet_type: petType,
        pet_gender: petGender,
        pet_breed: petBreed,
        pet_birth_date: petBirthDate,
      },
    },
  })

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}