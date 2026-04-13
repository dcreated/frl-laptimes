'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

function DebugContent() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [unauthorized, setUnauthorized] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/log', {
        headers: { 'x-log-key': key ?? '' },
      })
      if (res.status === 401) {
        setUnauthorized(true)
        return
      }
      const data = await res.json()
      setEntries(data.entries ?? [])
      setLastRefresh(new Date())
    } catch {
      // ignore fetch errors
    }
  }, [key])

  async function checkSupabase() {
    try {
      const { error } = await supabase.from('sessions').select('id').limit(1)
      setSupabaseOk(!error)
    } catch {
      setSupabaseOk(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    checkSupabase()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-medium">Access denied. Check the ?key= parameter.</p>
      </div>
    )
  }

  const levelColor: Record<string, string> = {
    info: 'var(--fg)',
    warn: '#f59e0b',
    error: '#ef4444',
  }

  const uploadEntries = entries
    .filter(e => e.message.toLowerCase().includes('upload'))
    .slice(-5)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold uppercase" style={{ fontFamily: 'var(--font-barlow, sans-serif)' }}>
          <span style={{ color: 'var(--accent)' }}>FRL</span> Debug
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--fg-muted)]">
            Refreshed: {lastRefresh.toLocaleTimeString('en-GB')}
          </span>
          <a href="/" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">← Back</a>
        </div>
      </div>

      {/* Supabase status */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] rounded p-4 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-3">Supabase connection</h2>
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: supabaseOk === null ? '#6b7280' : supabaseOk ? '#16a34a' : '#ef4444',
            }}
          />
          <span className="text-sm font-medium">
            {supabaseOk === null ? 'Checking...' : supabaseOk ? 'Connected' : 'Unreachable'}
          </span>
        </div>
      </div>

      {/* Recent uploads */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] rounded p-4 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          Last 5 upload attempts
        </h2>
        {uploadEntries.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No upload activity found.</p>
        ) : (
          <div className="space-y-2">
            {uploadEntries.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="font-mono-time text-[var(--fg-muted)] shrink-0 text-xs">
                  {new Date(e.timestamp).toLocaleTimeString('en-GB')}
                </span>
                <span style={{ color: levelColor[e.level] }}>{e.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full log */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] rounded p-4">
        <h2 className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          Log ({entries.length} entries, auto-refreshed every 5s)
        </h2>
        <div className="overflow-auto max-h-[500px] rounded bg-[var(--bg)] p-3">
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] font-mono-time">— empty —</p>
          ) : (
            <div className="space-y-0.5">
              {[...entries].reverse().map((e, i) => (
                <div key={i} className="flex gap-3 text-xs font-mono-time leading-5">
                  <span className="text-[var(--fg-muted)] shrink-0 w-24">
                    {new Date(e.timestamp).toLocaleTimeString('en-GB')}
                  </span>
                  <span
                    className="w-12 shrink-0 uppercase"
                    style={{ color: levelColor[e.level] }}
                  >
                    {e.level}
                  </span>
                  <span className="break-all">{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DebugPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--fg-muted)] text-sm">Loading...</div>}>
      <DebugContent />
    </Suspense>
  )
}
