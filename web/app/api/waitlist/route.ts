import { NextRequest, NextResponse } from 'next/server'
import { ensureSchema, getDb } from '@/lib/db'

function isValidEmail(email: string): boolean {
  return /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/.test(
    email.trim(),
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    await ensureSchema()
    const db = getDb()
    await db.query(
      `insert into waitlist_signups (email) values ($1)
       on conflict (email) do update set email = excluded.email`,
      [email.trim().toLowerCase()],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[waitlist] error:', err)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function GET() {
  try {
    await ensureSchema()
    const db = getDb()
    const result = await db.query<{ count: number }>(
      'select count(*)::int as count from waitlist_signups',
    )
    const count = result.rows[0]?.count ?? 0
    return NextResponse.json({ count })
  } catch (err) {
    console.error('[waitlist] count error:', err)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }
}


