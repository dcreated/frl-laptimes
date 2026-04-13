'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { parseCsvText, laptimeToMs, formatGap, LapEntry } from '@/lib/parseCsv'

// Car brand color map
const CAR_COLORS: Record<string, { bg: string; text: string }> = {
  ferrari:    { bg: '#FAECE7', text: '#993C1D' },
  porsche:    { bg: '#FAEEDA', text: '#854F0B' },
  bmw:        { bg: '#E6F1FB', text: '#185FA5' },
  mercedes:   { bg: '#EAF3DE', text: '#3B6D11' },
  ford:       { bg: '#EEEDFE', text: '#534AB7' },
  mclaren:    { bg: '#F1EFE8', text: '#5F5E5A' },
  lamborghini:{ bg: '#FAEEDA', text: '#854F0B' },
  audi:       { bg: '#E1F5EE', text: '#0F6E56' },
  amr:        { bg: '#F1EFE8', text: '#5F5E5A' },
  lexus:      { bg: '#E1F5EE', text: '#0F6E56' },
  nissan:     { bg: '#F1EFE8', text: '#5F5E5A' },
  bentley:    { bg: '#EAF3DE', text: '#3B6D11' },
}

function getCarColors(car: string) {
  const key = car.toLowerCase().split(' ')[0]
  return CAR_COLORS[key] ?? { bg: '#F1EFE8', text: '#5F5E5A' }
}

function CarPill({ car }: { car: string }) {
  const { bg, text } = getCarColors(car)
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {car}
    </span>
  )
}

type SortKey = 'pos' | 'name' | 'car' | 'laptime' | 'gap' | 'splitOne' | 'splitTwo' | 'splitThree' | 'ballastKg'
type SortDir = 'asc' | 'desc'

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="col-pos px-3 py-3"><div className="h-4 w-6 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="col-name px-3 py-3">
        <div className="name-cell-inner">
          <div className="h-4 rounded bg-[var(--border)] animate-pulse name-text" style={{ width: '120px' }} />
          <div className="car-inline h-4 w-16 rounded bg-[var(--border)] animate-pulse" />
        </div>
      </td>
      <td className="col-car px-3 py-3"><div className="h-4 w-16 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="col-laptime px-3 py-3"><div className="h-4 w-16 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="col-gap px-3 py-3"><div className="h-4 w-12 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="portrait-hidden px-3 py-3"><div className="h-4 w-14 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="portrait-hidden px-3 py-3"><div className="h-4 w-14 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="portrait-hidden px-3 py-3"><div className="h-4 w-14 rounded bg-[var(--border)] animate-pulse" /></td>
      <td className="portrait-hidden px-3 py-3"><div className="h-4 w-10 rounded bg-[var(--border)] animate-pulse" /></td>
    </tr>
  )
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [entries, setEntries] = useState<LapEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('pos')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchNoMatch, setSearchNoMatch] = useState(false)
  const [highlightedName, setHighlightedName] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableSectionElement>(null)

  // Load sessions on mount
  useEffect(() => {
    async function loadSessions() {
      setSessionsLoading(true)
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('uploaded_at', { ascending: false })
          .limit(5)

        if (error) throw error
        setSessions(data ?? [])
        if (data && data.length > 0) setActiveSession(data[0])
      } catch (err) {
        setError('Failed to load sessions.')
        console.error(err)
      } finally {
        setSessionsLoading(false)
      }
    }
    loadSessions()
  }, [])

  // Load CSV when active session changes
  useEffect(() => {
    if (!activeSession) return

    async function loadCsv() {
      setLoading(true)
      setEntries([])
      setError(null)
      setSearchQuery('')
      setHighlightedName(null)

      try {
        const { data: urlData } = supabase.storage
          .from('laptimes-csv')
          .getPublicUrl(activeSession!.file_path)

        const response = await fetch(urlData.publicUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const text = await response.text()
        const parsed = parseCsvText(text)
        setEntries(parsed)
      } catch (err) {
        setError('Failed to load lap times.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadCsv()
  }, [activeSession])

  // Search / highlight logic
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setHighlightedName(null)
      setSearchNoMatch(false)
      return
    }
    const lower = query.toLowerCase()
    if (!tableRef.current) return

    const rows = Array.from(tableRef.current.querySelectorAll<HTMLTableRowElement>('tr[data-name]'))
    let found = false
    for (const row of rows) {
      const name = row.getAttribute('data-name') ?? ''
      if (name.includes(lower)) {
        setHighlightedName(name)
        setSearchNoMatch(false)
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        found = true
        break
      }
    }
    if (!found) {
      setHighlightedName(null)
      setSearchNoMatch(true)
    }
  }, [])

  // Sorting
  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const p1Ms = entries.length > 0 ? laptimeToMs(entries[0].laptime) : 0

  const bestSectors = entries.reduce((acc, e) => {
    const s1 = laptimeToMs(e.splitOne)
    const s2 = laptimeToMs(e.splitTwo)
    const s3 = laptimeToMs(e.splitThree)
    if (!acc.s1 || s1 < acc.s1) acc.s1 = s1
    if (!acc.s2 || s2 < acc.s2) acc.s2 = s2
    if (!acc.s3 || s3 < acc.s3) acc.s3 = s3
    return acc
  }, { s1: 0, s2: 0, s3: 0 })

  const sortedEntries = [...entries].sort((a, b) => {
    let av: number | string = 0
    let bv: number | string = 0
    switch (sortKey) {
      case 'pos': av = a.pos; bv = b.pos; break
      case 'name': av = a.name; bv = b.name; break
      case 'car': av = a.car; bv = b.car; break
      case 'laptime': av = laptimeToMs(a.laptime); bv = laptimeToMs(b.laptime); break
      case 'gap': av = laptimeToMs(a.laptime) - p1Ms; bv = laptimeToMs(b.laptime) - p1Ms; break
      case 'splitOne': av = laptimeToMs(a.splitOne); bv = laptimeToMs(b.splitOne); break
      case 'splitTwo': av = laptimeToMs(a.splitTwo); bv = laptimeToMs(b.splitTwo); break
      case 'splitThree': av = laptimeToMs(a.splitThree); bv = laptimeToMs(b.splitThree); break
      case 'ballastKg': av = a.ballastKg; bv = b.ballastKg; break
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const fastest = entries.length > 0 ? entries[0] : null

  function SortHeader({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) {
    const active = sortKey === col
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${className}`}
        style={{ color: active ? 'var(--accent)' : 'var(--fg-muted)' }}
        onClick={() => handleSort(col)}
      >
        {label}
        {active && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </th>
    )
  }

  function BallastBadge({ kg }: { kg: number }) {
    if (kg === 0) return <span className="text-[var(--fg-muted)] font-mono-time text-sm">0</span>
    if (kg > 0) return <span className="text-[var(--accent)] font-mono-time text-sm">+{kg}</span>
    return <span className="text-green-600 font-mono-time text-sm">{kg}</span>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-5 pb-6">
      {/* Header */}
      <header className="mb-0">
        <div className="flex items-center justify-between py-2">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-black ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/frl-logo.png" alt="FRL logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold uppercase tracking-wide leading-none"
                style={{ fontFamily: 'var(--font-barlow, sans-serif)' }}
              >
                <span className="frl-gradient-text">FRL</span>
                <span className="ml-1.5">Laptimes</span>
              </h1>
              <p
                className="text-xs tracking-widest uppercase mt-1"
                style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-barlow, sans-serif)' }}
              >
                Sim racing at its very best!
              </p>
            </div>
          </div>

          <a
            href="/upload"
            className="text-sm px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--accent)] transition-colors flex-shrink-0"
          >
            Upload CSV
          </a>
        </div>

        {/* FRL gradient separator */}
        <div className="h-px mt-4 mb-6" style={{ background: 'var(--frl-gradient)' }} />
      </header>

      {/* Session tabs — desktop horizontal, mobile dropdown */}
      {sessionsLoading ? (
        <div className="h-10 rounded bg-[var(--border)] animate-pulse mb-6 w-full max-w-md" />
      ) : sessions.length === 0 ? (
        <p className="text-[var(--fg-muted)] mb-6">No sessions available yet. <a href="/upload" className="underline">Upload a CSV</a>.</p>
      ) : (
        <>
          {/* Mobile: dropdown */}
          <div className="sm:hidden mb-4">
            <select
              className="w-full border border-[var(--border)] bg-[var(--bg-card)] rounded px-3 py-2 text-sm"
              value={activeSession?.id ?? ''}
              onChange={e => {
                const s = sessions.find(s => s.id === e.target.value)
                if (s) setActiveSession(s)
              }}
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.track ? ` — ${s.track}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Desktop: tabs */}
          <div className="hidden sm:flex gap-2 mb-6 flex-wrap">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSession(s)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors border ${activeSession?.id === s.id ? 'frl-tab-active' : ''}`}
                style={activeSession?.id !== s.id ? {
                  background: 'var(--bg-card)',
                  color: 'var(--fg)',
                  borderColor: 'var(--border)',
                } : {}}
              >
                {s.name}{s.track ? ` — ${s.track}` : ''}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search bar */}
      {entries.length > 0 && (
        <div className="mb-4 relative flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search driver name..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-card)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          {searchNoMatch && (
            <span className="text-sm text-[var(--fg-muted)]">No driver found</span>
          )}
        </div>
      )}

      {/* KPI bar */}
      {(entries.length > 0 || loading) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'Fastest lap',
              value: fastest?.laptime ?? '—',
              mono: true,
              accent: true,
            },
            {
              label: 'Fastest driver',
              value: fastest?.name ?? '—',
              mono: false,
              accent: false,
            },
            {
              label: 'Total entries',
              value: entries.length > 0 ? String(entries.length) : '—',
              mono: true,
              accent: false,
            },
          ].map(card => (
            <div
              key={card.label}
              className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1" style={{ fontFamily: 'var(--font-barlow, sans-serif)' }}>
                {card.label}
              </p>
              {loading ? (
                <div className="h-6 w-24 rounded bg-[var(--border)] animate-pulse" />
              ) : (
                <p
                  className={`text-xl font-semibold ${card.mono ? 'font-mono-time' : ''}`}
                  style={{ color: card.accent ? 'var(--accent)' : 'var(--fg)' }}
                >
                  {card.value}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {(entries.length > 0 || loading) && (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm portrait-table">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <SortHeader col="pos" label="#" className="col-pos" />
                  <SortHeader col="name" label="Name" className="col-name" />
                  <th
                    className="col-car px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                    style={{ color: sortKey === 'car' ? 'var(--accent)' : 'var(--fg-muted)' }}
                    onClick={() => handleSort('car')}
                  >
                    Car{sortKey === 'car' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <SortHeader col="laptime" label="Laptime" className="col-laptime" />
                  <SortHeader col="gap" label="Gap" className="col-gap" />
                  <SortHeader col="splitOne" label="S1" className="portrait-hidden" />
                  <SortHeader col="splitTwo" label="S2" className="portrait-hidden" />
                  <SortHeader col="splitThree" label="S3" className="portrait-hidden" />
                  <SortHeader col="ballastKg" label="Ballast" className="portrait-hidden" />
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {loading
                  ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                  : sortedEntries.map(entry => {
                    const gapMs = laptimeToMs(entry.laptime) - p1Ms
                    const isP1 = entry.pos === 1
                    const nameKey = entry.name.toLowerCase()
                    const isHighlighted = highlightedName === nameKey

                    const s1Ms = laptimeToMs(entry.splitOne)
                    const s2Ms = laptimeToMs(entry.splitTwo)
                    const s3Ms = laptimeToMs(entry.splitThree)

                    let rowBg = 'transparent'
                    if (isHighlighted) rowBg = 'var(--accent-highlight)'
                    else if (isP1) rowBg = 'var(--accent-subtle)'

                    return (
                      <tr
                        key={`${entry.pos}-${entry.name}`}
                        data-name={nameKey}
                        className="border-b border-[var(--border)] last:border-0 transition-colors"
                        style={{ background: rowBg }}
                      >
                        <td className="col-pos px-3 py-3 font-mono-time font-medium text-[var(--fg-muted)]">
                          {entry.pos}
                        </td>
                        <td className="col-name px-3 py-3 font-medium" style={{ color: isHighlighted ? 'var(--accent)' : 'var(--fg)' }}>
                          <div className="name-cell-inner">
                            <span className="name-text">{entry.name}</span>
                            <span className="car-inline"><CarPill car={entry.car} /></span>
                          </div>
                        </td>
                        <td className="col-car px-3 py-3">
                          <CarPill car={entry.car} />
                        </td>
                        <td className="col-laptime px-3 py-3 font-mono-time">
                          {entry.laptime}
                        </td>
                        <td className="col-gap px-3 py-3 font-mono-time text-[var(--fg-muted)]">
                          {formatGap(gapMs)}
                        </td>
                        <td className="portrait-hidden px-3 py-3 font-mono-time"
                          style={{ color: s1Ms === bestSectors.s1 ? '#16a34a' : 'var(--fg)', fontWeight: s1Ms === bestSectors.s1 ? 500 : 400 }}>
                          {entry.splitOne}
                        </td>
                        <td className="portrait-hidden px-3 py-3 font-mono-time"
                          style={{ color: s2Ms === bestSectors.s2 ? '#16a34a' : 'var(--fg)', fontWeight: s2Ms === bestSectors.s2 ? 500 : 400 }}>
                          {entry.splitTwo}
                        </td>
                        <td className="portrait-hidden px-3 py-3 font-mono-time"
                          style={{ color: s3Ms === bestSectors.s3 ? '#16a34a' : 'var(--fg)', fontWeight: s3Ms === bestSectors.s3 ? 500 : 400 }}>
                          {entry.splitThree}
                        </td>
                        <td className="portrait-hidden px-3 py-3">
                          <BallastBadge kg={entry.ballastKg} />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !sessionsLoading && entries.length === 0 && activeSession && !error && (
        <p className="text-[var(--fg-muted)] text-sm">No lap times found for this session.</p>
      )}
    </div>
  )
}
