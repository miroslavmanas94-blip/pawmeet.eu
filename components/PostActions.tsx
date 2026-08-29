'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function PostActions({ postId, userId }: { postId: string; userId: string }) {
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = async () => {
    const supabase = createClient()
    if (isSaved) {
      await supabase.from('saved_items').delete().eq('post_id', postId).eq('user_id', userId)
      setIsSaved(false)
    } else {
      await supabase.from('saved_items').insert({ post_id: postId, user_id: userId })
      setIsSaved(true)
    }
  }

  return (
    <div className="flex gap-4 pt-2">
      <button onClick={handleSave} className="text-xs font-bold hover:opacity-80 transition-opacity">
        {isSaved ? '🔖 Uloženo' : '📑 Uložit'}
      </button>
    </div>
  )
}