'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import BottomNav from '@/components/BottomNav'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages: Message[]
}

const INITIAL_WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Ahoj! Vítá tě PawMeet AI 🐾 – tvůj chytrý zvířecí parťák. Můžeš se mě zeptat na cokoli: od běžného povídání přes péči o mazlíčky až po zdraví, výcvik a chování jakéhokoliv zvířete na světě. S čím ti dnes pomůžu?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function PawMeetAIPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('pawmeet_clean_ai_sessions')
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved)
        if (parsed.length > 0) {
          setSessions(parsed)
          setActiveSessionId(parsed[0].id)
        } else {
          createNewChat()
        }
      } catch (e) {
        createNewChat()
      }
    } else {
      createNewChat()
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded && sessions.length > 0) {
      localStorage.setItem('pawmeet_clean_ai_sessions', JSON.stringify(sessions))
    }
  }, [sessions, isLoaded])

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, isGenerating])

  const createNewChat = () => {
    const newId = Date.now().toString()
    const newSession: ChatSession = {
      id: newId,
      title: 'Nový chat',
      createdAt: new Date().toLocaleDateString(),
      messages: [INITIAL_WELCOME]
    }

    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newId)
    setIsSidebarOpen(false)
  }

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    if (updated.length === 0) {
      const newId = Date.now().toString()
      const freshSession: ChatSession = {
        id: newId,
        title: 'Nový chat',
        createdAt: new Date().toLocaleDateString(),
        messages: [INITIAL_WELCOME]
      }
      setSessions([freshSession])
      setActiveSessionId(newId)
    } else {
      setSessions(updated)
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id)
      }
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = textToSend || input
    if (!promptText.trim() || isGenerating || !activeSession) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const currentMessages = activeSession.messages
    const updatedMessages = [...currentMessages, userMsg]
    
    let newTitle = activeSession.title
    if (currentMessages.length <= 1) {
      newTitle = promptText.length > 25 ? promptText.slice(0, 25) + '...' : promptText
    }

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, title: newTitle, messages: updatedMessages }
      }
      return s
    }))

    setInput('')
    setIsGenerating(true)

    try {
      const puter = (window as any).puter
      if (!puter || !puter.ai) {
        throw new Error('Puter.js není k dispozici.')
      }

      const response = await puter.ai.chat(promptText)
      const reply = typeof response === 'string' ? response : (response?.message?.content || response?.text || JSON.stringify(response))

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply || 'Omlouvám se, ale nepodařilo se mi získat odpověď.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, messages: [...s.messages, assistantMsg] }
        }
        return s
      }))
    } catch (err: any) {
      console.error(err)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Omlouvám se, nastala chyba při připojení k Puter AI. Zkus to prosím za chvíli znovu.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, messages: [...s.messages, errorMsg] }
        }
        return s
      }))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-screen w-full bg-emerald-50/40 text-slate-800 font-sans antialiased flex flex-col overflow-hidden">
      
      {/* Pevná hlavička */}
      <header className="flex-shrink-0 z-40 bg-white/90 backdrop-blur-xl border-b border-emerald-100 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <span className="text-xl text-white">🐾</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900">PawMeet AI</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Puter AI (Bez limitů)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pro všechna zvířata světa
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition flex items-center gap-2 text-xs shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span>Historie chatů</span>
        </button>
      </header>

      {/* Overlay pro sidebar */}
      <div 
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar historie */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <h2 className="font-bold text-slate-800 text-sm">Moje Chaty</h2>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <span>+</span> Nová konverzace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id)
                setIsSidebarOpen(false)
              }}
              className={`group w-full p-3 rounded-xl text-left text-xs transition flex items-center justify-between cursor-pointer border ${
                activeSessionId === s.id
                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                  : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-sm">🐾</span>
                <div className="truncate">
                  <p className="truncate">{s.title}</p>
                  <span className="text-[10px] text-slate-400 font-normal">{s.createdAt}</span>
                </div>
              </div>

              <button
                onClick={(e) => deleteChat(e, s.id)}
                title="Smazat chat"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          PawMeet AI • Všechna zvířata světa
        </div>
      </aside>

      {/* Skrolovatelná hlavní část se zprávami */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 overflow-y-auto flex flex-col gap-4">
        {activeSession?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm ${
              msg.role === 'user'
                ? 'bg-slate-800 text-white'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white'
            }`}>
              {msg.role === 'user' ? 'Vy' : '🐾'}
            </div>

            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-tr-none shadow-md'
                : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className={`block text-[10px] mt-1.5 text-right ${
                msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start gap-3 flex-row">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-sm animate-pulse">
              🐾
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 font-medium text-slate-600">PawMeet AI přemýšlí...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Pevná patka se vstupem */}
      <footer className="flex-shrink-0 z-30 w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
        <div className="relative flex items-center bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 shadow-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Zeptej se na cokoliv o zvířatech..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 px-3 py-2 outline-none resize-none max-h-32"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isGenerating}
            className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-md active:scale-95"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3 21l18-9L3 3l3 9zm0 0h7" />
            </svg>
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-400 mt-2">
          PawMeet AI – Běží přímo v prohlížeči přes Puter.js bez nutnosti API klíčů.
        </p>
      </footer>

      <BottomNav />
    </div>
  )
}