'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, MessageCircle, PawPrint, Trash2, Send, Menu, X } from 'lucide-react'

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
  content: 'Ahoj, jsem PawMeet AI. Pomůžu ti s výcvikem, chováním a péčí o psa i s běžnými otázkami mimo kynologii. U zdravotních potíží nenahrazuji veterináře. S čím dnes potřebuješ poradit?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

let localTextGenerator: any = null

export default function PawMeetAIPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

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
    setStatusMessage('Připojuji AI…')
    let remoteNotice = ''
    const historyContext = currentMessages
      .filter(message => message.id !== 'welcome')
      .slice(-8)
      .map(message => `${message.role === 'user' ? 'Uživatel' : 'PawMeet AI'}: ${message.content}`)
      .join('\n')
      .slice(-1200)

    try {
      // Server-side AI is optional; provider credentials remain server-side.
      try {
        const remoteResponse = await fetch('/api/ai/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, context: historyContext }),
        })
        const remoteData = await remoteResponse.json().catch(() => ({}))
        if (remoteResponse.ok && typeof remoteData?.answer === 'string' && remoteData.answer.trim()) {
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: remoteData.answer.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: [...s.messages, assistantMsg] } : s))
          return
        }
        remoteNotice = typeof remoteData?.error === 'string' ? remoteData.error : typeof remoteData?.message === 'string' ? remoteData.message : `Serverová AI není dostupná (HTTP ${remoteResponse.status}).`
      } catch {
        remoteNotice = 'Serverovou AI se nepodařilo kontaktovat.'
      }

      // Free local inference: the model runs in the visitor's browser.
      setStatusMessage('Načítám místní AI model. První spuštění může chvíli trvat…')
      if (!localTextGenerator) {
        const transformers = await import('@huggingface/transformers')
        localTextGenerator = await transformers.pipeline(
          'text-generation',
          'onnx-community/Qwen2.5-0.5B-Instruct',
          { dtype: 'q4' }
        )
      }
      setStatusMessage('Připravuji odpověď…')
      const localPrompt = `Jsi PawMeet AI, univerzální asistent a specialista na psy. Odpovídej česky, přirozeně, užitečně a bezpečně. U psů podporuj pozitivní trénink bez trestů a zastrašování. Nedávej jisté veterinární diagnózy; u naléhavých příznaků doporuč veterináře.\n\nPředchozí konverzace:\n${historyContext || 'Žádná'}\n\nUživatel: ${promptText}\nPawMeet AI:`
      const generated = await localTextGenerator(localPrompt, { max_new_tokens: 220, temperature: 0.65, do_sample: true })
      const raw = generated?.[0]?.generated_text
      const reply = typeof raw === 'string' ? raw.slice(raw.lastIndexOf('PawMeet AI:') + 'PawMeet AI:'.length).trim() : ''

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply || 'Omlouvám se, místní model vrátil prázdnou odpověď. Zkus dotaz formulovat jinak.',
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
      const reason = err instanceof Error ? err.message.slice(0, 180) : 'neznámá chyba'
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${remoteNotice ? remoteNotice + '\n\n' : ''}Nepodařilo se spustit místní AI model (${reason}). Zkontroluj připojení a zkus to znovu. Serverová AI vyžaduje nakonfigurovaného poskytovatele; žádná placená služba nebyla automaticky zapnuta.`,
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
      setStatusMessage('')
    }
  }

  return (
    <div className="h-[100dvh] w-full bg-[#f7f9f5] text-[#183f2c] font-sans antialiased flex flex-col overflow-hidden pb-16 md:pb-0 md:pl-[240px] xl:md:pl-[260px]">
      
      {/* Pevná hlavička přes celou zbývající šířku */}
      <header className="flex-shrink-0 z-40 bg-white border-b border-[#e2e8df] px-4 sm:px-8 py-3.5 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF0FF] border border-[#D8DDFE] flex items-center justify-center text-[#5B5BF7]">
            <Sparkles size={20} strokeWidth={1.8}/>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#183f2c]">PawMeet AI</h1>
            <p className="text-[11px] text-slate-500">Psí specialista i univerzální asistent</p>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="min-h-11 p-2.5 rounded-xl bg-white hover:bg-[#f7f9f5] text-[#5B5BF7] border border-[#D8DDFE] font-semibold transition flex items-center gap-2 text-xs"
        >
          <Menu size={16} strokeWidth={1.8}/>
          <span>Historie chatů</span>
        </button>
      </header>

      {/* Overlay pro sidebar */}
      <div 
        className={`fixed inset-0 z-50 bg-[#183f2c]/25 backdrop-blur-sm transition-opacity ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar historie */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-white shadow-xl border-l border-[#e2e8df] transform transition-transform duration-300 ease-in-out flex flex-col justify-between ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-[#e2e8df] flex items-center justify-between bg-[#f7f9f5]">
          <div className="flex items-center gap-2">
            <MessageCircle size={17} className="text-[#5B5BF7]"/>
            <h2 className="font-bold text-[#183f2c] text-sm">Historie konverzací</h2>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Zavřít historii" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X size={17}/>
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#5B5BF7] hover:bg-[#4F46E5] text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
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
                <MessageCircle size={16} className="shrink-0 text-[#5B5BF7]"/>
                <div className="truncate">
                  <p className="truncate">{s.title}</p>
                  <span className="text-[10px] text-slate-400 font-normal">{s.createdAt}</span>
                </div>
              </div>

              <button
                onClick={(e) => deleteChat(e, s.id)}
                title="Smazat chat" aria-label="Smazat chat"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
              >
                <Trash2 size={15}/>
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          PawMeet AI · Tvoje konverzace
        </div>
      </aside>

      {/* Skrolovatelná hlavní část se zprávami roztažená na maximum */}
      <main className="flex-1 w-full px-4 sm:px-8 py-6 overflow-y-auto flex flex-col gap-4">
        {activeSession?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 w-full ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm ${
              msg.role === 'user'
                ? 'bg-slate-800 text-white'
                : 'bg-[#EEF0FF] text-[#5B5BF7] border border-[#D8DDFE]'
            }`}>
              {msg.role === 'user' ? 'Vy' : <PawPrint size={15} />}
            </div>

            <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#5B5BF7] text-white rounded-tr-none'
                : 'bg-white text-[#183f2c] border border-[#e2e8df] rounded-tl-none'
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
          <div className="flex items-start gap-3 flex-row w-full">
            <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] border border-[#D8DDFE] flex items-center justify-center text-[#5B5BF7] animate-pulse">
              <PawPrint size={15}/>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-[#5B5BF7] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-[#C7C9FF] rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 font-medium text-slate-600">{statusMessage || 'PawMeet AI přemýšlí...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Pevná patka se vstupem roztažená na plnou šířku nad BottomNav */}
      <footer className="flex-shrink-0 z-30 w-full px-4 sm:px-8 pb-20 md:pb-4 pt-2">
        <div className="relative flex items-center bg-white border border-[#D8DDFE] rounded-2xl p-2 shadow-sm focus-within:border-[#5B5BF7] focus-within:ring-2 focus-within:ring-[#D8DDFE] transition w-full">
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
            placeholder="Napiš dotaz na psa nebo cokoli dalšího…"
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 px-3 py-2 outline-none resize-none max-h-32"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isGenerating}
            aria-label="Odeslat zprávu" className="flex-shrink-0 w-11 h-11 bg-[#5B5BF7] hover:bg-[#4F46E5] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition active:scale-95"
          >
            <Send size={17} strokeWidth={1.8}/>
          </button>
        </div>
      </footer>

    </div>
  )
}