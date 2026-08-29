'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Vytvoření nového příspěvku
export async function createPostAction(formData: FormData) {
  const supabase = await createClient()
  const content = formData.get('content') as string
  const imageUrl = formData.get('imageUrl') as string | null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Uživatel není přihlášen')

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content,
    image_url: imageUrl,
  })

  if (error) throw new Error(error.message)

  // Obnovení keše – data se ihned zobrazí na hlavní stránce i na profilu
  revalidatePath('/')
  revalidatePath('/profile')
}

// Přidání nového Story
export async function createStoryAction(mediaUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Uživatel není přihlášen')

  const { error } = await supabase.from('stories').insert({
    user_id: user.id,
    media_url: mediaUrl,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/')
}

// Uložení / zrušení uložení příspěvku do profilu
export async function toggleSaveAction(postId: string, isSaved: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Uživatel není přihlášen')

  if (isSaved) {
    await supabase.from('saved_items').delete().eq('post_id', postId).eq('user_id', user.id)
  } else {
    await supabase.from('saved_items').insert({ post_id: postId, user_id: user.id })
  }

  revalidatePath('/profile')
}