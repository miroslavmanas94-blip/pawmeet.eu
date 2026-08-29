'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PostActions } from '@/components/PostActions'

interface Post {
  id: string
  content: string
  image_url?: string
  created_at: string
  user_id: string
  profiles?: {
    full_name?: string
    avatar_url?: string
  }
}

interface FeedProps {
  initialPosts: Post[]
  currentUserId: string
}

export function Feed({ initialPosts, currentUserId }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime_posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article
          key={post.id}
          className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
        >
          {/* Hlavička příspěvku */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center font-bold text-purple-600 dark:text-purple-300 overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>🐾</span>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {post.profiles?.full_name || 'Uživatel PawMeet'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(post.created_at).toLocaleDateString('cs-CZ')}
              </p>
            </div>
          </div>

          {/* Text příspěvku */}
          {post.content && (
            <p className="text-sm text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-line">
              {post.content}
            </p>
          )}

          {/* Obrázek příspěvku */}
          {post.image_url && (
            <div className="rounded-xl overflow-hidden mb-3 border border-slate-100 dark:border-slate-800 max-h-96">
              <img
                src={post.image_url}
                alt="Obrázek příspěvku"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Tlačítka akcí (Uložit, Lajk, Komentář) */}
          <PostActions postId={post.id} userId={currentUserId} />
        </article>
      ))}
    </div>
  )
}