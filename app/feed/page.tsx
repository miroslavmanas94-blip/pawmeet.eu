'use client'

import { useState, useEffect } from 'react'

type Post = {
  id: string
  author: string
  text: string
  likes: number
  time: string
}

export default function SharedFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  // Načtení příspěvků ze serveru
  const loadPosts = async () => {
    try {
      const res = await fetch('/api/posts')
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      console.error('Chyba při načítání:', err)
    }
  }

  useEffect(() => {
    loadPosts()
    // Pravidelná obnova dat každé 4 sekundy pro živé příspěvky od ostatních
    const interval = setInterval(loadPosts, 4000)
    return () => clearInterval(interval)
  }, [])

  // Odeslání příspěvku viditelného všem
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: author || 'Sousední mazlíček', text })
    })

    setText('')
    setLoading(false)
    loadPosts()
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-black text-purple-700">🐾 Příběhy ze sousedství</h1>

      {/* Formulář pro přidání příspěvku */}
      <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm space-y-3">
        <input
          type="text"
          placeholder="Jméno mazlíčka (např. Max)..."
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full p-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800"
        />
        <textarea
          placeholder="Co má váš mazlíček nového?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800 resize-none h-20"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? 'Publikuji...' : 'Sdílet se všemi 🚀'}
        </button>
      </form>

      {/* Zobrazení veřejného feedu */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="font-bold text-purple-600">{post.author}</span>
              <span>{post.time}</span>
            </div>
            <p className="text-sm font-medium">{post.text}</p>
            <div className="text-xs text-slate-400 font-semibold pt-1">
              ❤️ {post.likes} paculek
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}