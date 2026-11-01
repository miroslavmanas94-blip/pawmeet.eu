import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// This legacy endpoint returned fabricated AI text and accepted anonymous requests.
// The supported, authenticated assistant is implemented at /api/ai/coach.
export async function POST() {
  return NextResponse.json(
    { error: 'Tento starý endpoint už není podporován. Použij aktuální PawMeet AI.' },
    { status: 410 }
  )
}
