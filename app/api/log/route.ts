import { NextRequest, NextResponse } from 'next/server'
import { getLog } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const logKey = request.headers.get('x-log-key')
  const envKey = process.env.LOG_KEY

  if (!envKey || logKey !== envKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entries = getLog()
  return NextResponse.json({ entries })
}
