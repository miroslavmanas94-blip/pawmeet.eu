import BottomNav from '../../components/BottomNav'
import { createClient } from '../../utils/supabase/server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  // Načtení reálných příspěvků z databáze Supabase
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      likes_count,
      profiles (
        username,
        first_name,
        pet_name,
        pet_type,
        pet_breed
      )
    `)
    .order('created_at', { ascending: false })

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

        {/* Formulář pro vytvoření nového příspěvku */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <span className="text-3xl">🐾</span>
          <input
            type="text"
            placeholder="Co váš mazlíček právě vyvádí?"
            className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Zobrazení reálných příspěvků z DB */}
        <section className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <article key={post.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
                
                {/* Hlavička příspěvku */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-2xl">
                      {post.profiles?.pet_type === 'kocka' ? '🐱' : '🐶'}
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight">
                        {post.profiles?.pet_name || 'Mazlíček'}{' '}
                        <span className="text-xs font-normal text-gray-400">
                          ({post.profiles?.first_name || 'Páníček'})
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {post.profiles?.pet_breed || 'Kříženec'}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 font-bold">•••</button>
                </div>

                {/* Obsah */}
                <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {post.content}
                </p>

                {/* Tlačítka reaktivity */}
                <div className="flex items-center gap-6 pt-2 text-xs font-bold text-gray-500 border-t border-gray-100 dark:border-gray-800">
                  <button className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                    🐾 {post.likes_count || 0} Pac
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                    💬 Komentáře
                  </button>
                </div>

              </article>
            ))
          ) : (
            /* Zobrazení, když v databázi ještě nejsou žádné příspěvky */
            <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="text-5xl mb-3">🦴</div>
              <h3 className="text-lg font-black text-gray-800 dark:text-gray-200 mb-1">
                Zatím tu nic není
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Smečka zatím odpočívala. Napište první příspěvek a probuďte to tu!
              </p>
            </div>
          )}
        </section>

      </main>

      {/* Spodní navigace */}
      <BottomNav />

    </div>
  )
}