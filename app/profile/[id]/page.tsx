'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  username: string
  avatar_url: string
  bio?: string
}

type Post = {
  id: string
  media_url: string
  media_type: 'image' | 'video'
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params?.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return

    const loadProfileData = async () => {
      const supabase = createClient()
      
      // 1. Zjistit přihlášeného uživatele
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Pokud kliknul na svůj vlastní profil, přesměrovat na /profile
        if (user.id === profileId) {
          router.push('/profile')
          return
        }
      }

      // 2. Načíst profil vybraného uživatele
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (profileData) setProfile(profileData)

      // 3. Načíst příspěvky uživatele
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, media_url, media_type')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })

      if (postsData) setPosts(postsData as Post[])

      // 4. Počet sledujících a sledovaných
      const { count: followers } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId)

      const { count: following } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId)

      setFollowersCount(followers || 0)
      setFollowingCount(following || 0)

      // 5. Zjistit, zda ho aktuální uživatel už sleduje
      if (user) {
        const { data: followCheck } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileId)
          .single()

        if (followCheck) setIsFollowing(true)
      }

      setLoading(false)
    }

    loadProfileData()
  }, [profileId, router])

  // Přepnutí sledování (Follow / Unfollow)
  const handleFollowToggle = async () => {
    if (!currentUserId || !profileId) return
    const supabase = createClient()

    if (isFollowing) {
      setIsFollowing(false)
      setFollowersCount((prev) => Math.max(0, prev - 1))
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profileId)
    } else {
      setIsFollowing(true)
      setFollowersCount((prev) => prev + 1)
      await supabase
        .from('followers')
        .insert({ follower_id: currentUserId, following_id: profileId })
    }
  }

  // Přechod do Chatu s vybraným uživatelem
  const handleStartChat = () => {
    router.push(`/chat?userId=${profileId}`)
  }

  if (loading) {
    return <div className="text-center py-12 text-neutral-400">Načítám profil...</div>
  }

  if (!profile) {
    return <div className="text-center py-12 text-neutral-500">Profil nenalezen.</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24">
      {/* Horní lišta s tlačítkem Zpět */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center font-bold text-sm shadow-sm"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">{profile.username || 'Profil'}</h1>
      </div>

      {/* Info hlavička profilu (Instagram Style) */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-sm mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-100 overflow-hidden border-2 border-indigo-500 flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <div className="font-bold text-base">{posts.length}</div>
              <div className="text-xs text-neutral-500">Příspěvky</div>
            </div>
            <div>
              <div className="font-bold text-base">{followersCount}</div>
              <div className="text-xs text-neutral-500">Sledující</div>
            </div>
            <div>
              <div className="font-bold text-base">{followingCount}</div>
              <div className="text-xs text-neutral-500">Sleduje</div>
            </div>
          </div>
        </div>

        {/* Jméno a Bio */}
        <div className="mt-4">
          <h2 className="font-bold text-sm">{profile.username}</h2>
          {profile.bio && <p className="text-xs text-neutral-600 mt-1 whitespace-pre-line">{profile.bio}</p>}
        </div>

        {/* Tlačítka Akcí */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleFollowToggle}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
              isFollowing
                ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isFollowing ? 'Sledujete' : 'Sledovat'}
          </button>

          <button
            onClick={handleStartChat}
            className="flex-1 py-2.5 bg-neutral-100 text-neutral-800 font-bold text-xs rounded-xl border border-neutral-200 hover:bg-neutral-200 transition-all shadow-sm"
          >
            Zpráva
          </button>
        </div>
      </div>

      {/* Mřížka příspěvků (Instagram Grid) */}
      <div className="border-t border-neutral-200 pt-4">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Příspěvky</h3>
        
        {posts.length === 0 ? (
          <p className="text-center text-neutral-400 py-10 text-xs">Zatím žádné příspěvky.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {posts.map((post) => (
              <div key={post.id} className="aspect-square bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200/60 relative group">
                {post.media_type === 'video' ? (
                  <video src={post.media_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.media_url} alt="Post" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}