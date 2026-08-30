import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { prompt, history } = await req.json()

    // Zde můžeš později napojit reálné SDK (např. Google Gen AI SDK) pro volání AI s vyhledáváním
    const reply = `Tohle je chytrá odpověď od PawMeet AI pro tvůj dotaz: "${prompt}". Jakmile zapojíš API klíč, poběží to naplno.`

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Chyba při zpracování požadavku na serveru.' },
      { status: 500 }
    )
  }
}