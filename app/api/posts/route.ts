import { NextResponse } from 'next/server'

// Dočasné úložiště v paměti (pro trvalé ukládání propojte např. Supabase nebo PostgreSQL)
let sharedPosts = [
  { id: '1', author: 'Buddy & Max', text: '🏞️ Procházka v parku Stromovka!', likes: 12, time: 'před 10 min' },
  { id: '2', author: 'Luna', text: '🐱 Odpolední opalování na okně', likes: 8, time: 'před 25 min' }
]

export async function GET() {
  return NextResponse.json(sharedPosts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const newPost = {
    id: Date.now().toString(),
    author: body.author || 'Anonymní hafan',
    text: body.text,
    likes: 0,
    time: 'Právě teď'
  }
  
  // Přidání nového příspěvku na začátek seznamu
  sharedPosts.unshift(newPost)
  return NextResponse.json(newPost, { status: 201 })
}