'use client'

export function StoriesBar({ hasActiveStory, stories }: { hasActiveStory: boolean; stories: any[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto p-2">
      {/* Tlačítko Přidat / Zobrazit moje story */}
      <button 
        onClick={() => hasActiveStory ? console.log('Otevřít mé story') : console.log('Nahrát nové')}
        className="relative w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0"
      >
        <div className={`w-full h-full rounded-full flex items-center justify-center ${hasActiveStory ? 'ring-2 ring-purple-600' : ''}`}>
          <span className="text-xl">➕</span>
        </div>
      </button>

      {/* Ostatní uživatelé se stories */}
      {stories.map((story) => (
        <div key={story.id} className="w-16 h-16 rounded-full ring-2 ring-purple-500 p-0.5 flex-shrink-0 cursor-pointer">
          <img src={story.avatar_url} className="w-full h-full rounded-full object-cover" />
        </div>
      ))}
    </div>
  )
}