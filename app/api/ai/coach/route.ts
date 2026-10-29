import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

type CoachRequest = {
  dogName?: string
  age?: string
  goal?: string
  prompt?: string
  context?: string
}

export async function POST(request: Request) {
  let input: CoachRequest
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const goal = typeof input.goal === 'string' ? input.goal.trim().slice(0, 240) : ''
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim().slice(0, 1600) : ''
  const context = typeof input.context === 'string' ? input.context.trim().slice(0, 1600) : ''
  const dogName = typeof input.dogName === 'string' ? input.dogName.trim().slice(0, 80) : 'tvůj pes'
  const age = typeof input.age === 'string' ? input.age.trim().slice(0, 80) : ''
  if (!goal && !prompt) return NextResponse.json({ error: 'Doplň dotaz nebo tréninkový cíl.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Pro používání serverové AI se nejdřív přihlas.' }, { status: 401 })
  }

  // Keep provider credentials server-side. The endpoint is provider-agnostic:
  // configure AI_API_KEY, AI_BASE_URL and AI_MODEL in the deployment environment.
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({
      configured: false,
      message: 'Generativní AI zatím není připojena. Níže může aplikace nabídnout bezpečný základní plán; pro skutečné AI odpovědi nastav na serveru AI_API_KEY, AI_BASE_URL a AI_MODEL.'
    }, { status: 503 })
  }

  // Apply a small daily per-account cap before calling a potentially metered provider.
  const usageDate = new Date().toISOString().slice(0, 10)
  const { data: usage, error: usageError } = await supabase
    .from('ai_usage')
    .select('id, message_count')
    .eq('user_id', user.id)
    .eq('usage_date', usageDate)
    .maybeSingle()
  if (usageError) {
    return NextResponse.json({ error: 'Nepodařilo se ověřit denní limit AI.' }, { status: 503 })
  }
  if ((usage?.message_count ?? 0) >= 20) {
    return NextResponse.json({ error: 'Dnešní limit 20 serverových AI odpovědí je vyčerpán. Zkus to zítra nebo použij lokální model.' }, { status: 429 })
  }
  const { error: usageWriteError } = usage
    ? await supabase.from('ai_usage').update({ message_count: usage.message_count + 1 }).eq('id', usage.id).eq('user_id', user.id)
    : await supabase.from('ai_usage').insert({ user_id: user.id, usage_date: usageDate, message_count: 1 })
  if (usageWriteError) {
    return NextResponse.json({ error: 'Nepodařilo se uložit využití AI.' }, { status: 503 })
  }

  try {
    const endpoint = baseUrl.replace(/\/+$/, '') + '/chat/completions'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: 'Jsi PawMeet AI: univerzální asistent a zároveň specialista na psy, pozitivní výcvik, chování a péči. Odpovídej česky, přirozeně, konkrétně a bezpečně. U běžných témat pomáhej jako obecný asistent. U psů používej laskavé odměňování, krátké kroky a přestávky; nepodporuj tresty, zastrašování ani nebezpečné postupy. Nedávej veterinární diagnózy; u bolesti, náhlé změny chování nebo zdravotních příznaků doporuč veterináře. Přiznej nejistotu a nikdy si nevymýšlej fakta.'
          },
          {
            role: 'user',
            content: prompt ? `${context ? `Kontext předchozí konverzace:\n${context}\n\n` : ''}Dotaz uživatele: ${prompt}. Odpověz přímo na dotaz, česky a přiměřeně stručně. Pokud se týká tréninku, nabídni konkrétní bezpečné kroky.` : `Pes: ${dogName}. Věk: ${age || 'neuveden'}. Cíl: ${goal}. Kontext: ${context || 'neuveden'}. Navrhni plán na příštích 7 dní, každodenní krátké kroky, způsob odměňování a známky, kdy trénink ukončit.`
          }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    })
    if (!response.ok) {
      return NextResponse.json({ error: 'AI poskytovatel momentálně neodpovídá. Zkus to později.' }, { status: 502 })
    }
    const data = await response.json()
    const answer = data?.choices?.[0]?.message?.content
    if (typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: 'AI vrátila prázdnou odpověď.' }, { status: 502 })
    }
    return NextResponse.json({ configured: true, answer: answer.trim() })
  } catch {
    return NextResponse.json({ error: 'AI se nepodařilo kontaktovat. Zkontroluj nastavení poskytovatele.' }, { status: 502 })
  }
}
