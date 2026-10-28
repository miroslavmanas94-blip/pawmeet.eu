import { NextResponse } from 'next/server'

// Legacy endpoint intentionally disabled: publishing is handled by the authenticated PawMeet feed.
export async function GET() {
  return NextResponse.json({ error: 'This endpoint is retired. Use /domu.' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: 'This endpoint is retired. Use /domu.' }, { status: 410 })
}
