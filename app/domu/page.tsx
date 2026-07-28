import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export default function HomePage() {
  // Ukázkové příspěvky pro náhled
  const mockPosts = [
    {
      id: 1,
      author: 'Max',
      owner: 'Petr',
      avatar: '🐶',
      breed: 'Zlatý retrívr',
      time: 'Před 15 min',
      text: 'Dneska byla v parku super koulovačka! Kdo jde zítra běhat okolo Stromovky? 🦴',
      likes: 12,
      comments: 3,
    },
    {
      id: 2,
      author: 'Mína',
      owner: 'Klára',
      avatar: '🐱',
      breed: 'Britská modrá',
      time: 'Před 2 hod',
      text: 'Sluneční paprsek na gauči dobyt. Dnes už mě nikdo k ničemu nedonutí 😴☀️',
      likes: 24,
      comments: 5,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-24">
      
      {/* Horní lišta */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex justify-between items-center">
        <Link href="/domu" className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-1">
          🐾 PawMeet
        </Link>
        <div className="flex gap-3 text-xl">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">💬</button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">🔔</button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-6">
        
        {/* Lišta příběhů (Stories) */}
        <section className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex flex-col items-center min-w-[64px]">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-indigo-500 flex items-center justify-center text-2xl bg-indigo-50 dark:bg-indigo-950 cursor-pointer hover:scale-105 transition">
              ➕
            </div>
            <span className="text-[11px] font-bold mt-1 text-gray-500">Můj příběh</span>
          </div>

          {['🐶 Buddy', '🐱 Luna', '🐕 Rocky', '🐈 Micka'].map((story, index) => (
            <div key={index} className="flex flex-col items-center min-w-[64px]">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-600 cursor-pointer hover:scale-105 transition">
                <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-2xl">
                  {story.split(' ')[0]}
                </div>
              </div>
              <span className="text-[11px] font-bold mt-1 text-gray-600 dark:text-gray-400">
                {story.split(' ')[1]}
              </span>
            </div>
          ))}
        </section>

        {/* Výzva k napsání příspěvku */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <span className="text-3xl">🐾</span>
          <input
            type="text"
            placeholder="Co váš mazlíček právě vyvádí?"
            className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Feed Příspěvků */}
        <section className="space-y-4">
          {mockPosts.map((post) => (
            <article key={post.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
              
              {/* Hlavička příspěvku */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl">
                    {post.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight">
                      {post.author} <span className="text-xs font-normal text-gray-400">({post.owner})</span>
                    </div>
                    <div className="text-[11px] text-gray-400">{post.breed} • {post.time}</div>
                  </div>
                </div>
                <button className="text-gray-400 font-bold">•••</button>
              </div>

              {/* Text příspěvku */}
              <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {post.text}
              </p>

              {/* Tlačítka reaktivity */}
              <div className="flex items-center gap-6 pt-2 text-xs font-bold text-gray-500 border-t border-gray-100 dark:border-gray-800">
                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                  🐾 {post.likes} Pac
                </button>
                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                  💬 {post.comments} Komentáře
                </button>
                <button className="flex items-center gap-1.5 hover:text-indigo-600 transition ml-auto">
                  ✈️ Sdílet
                </button>
              </div>

            </article>
          ))}
        </section>

      </main>

      {/* Spodní navigace */}
      <BottomNav />

    </div>
  )
}