'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function UploadPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)

  const [sessionName, setSessionName] = useState('')
  const [trackName, setTrackName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (password === 'frl2026') {
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !sessionName.trim()) return

    setUploading(true)
    setError(null)
    setSuccess(false)
    setProgress(10)

    try {
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${timestamp}_${safeName}`

      setProgress(30)

      const { error: uploadError } = await supabase.storage
        .from('laptimes-csv')
        .upload(filePath, file, { contentType: 'text/csv', upsert: false })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      setProgress(70)

      const { error: dbError } = await supabase.from('sessions').insert({
        name: sessionName.trim(),
        track: trackName.trim() || null,
        file_path: filePath,
      })

      if (dbError) throw new Error(`Database error: ${dbError.message}`)

      setProgress(100)
      setSuccess(true)
      setSessionName('')
      setTrackName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--bg-card)] rounded p-8">
          <h1 className="text-2xl font-bold uppercase mb-6" style={{ fontFamily: 'var(--font-barlow, sans-serif)' }}>
            <span style={{ color: 'var(--accent)' }}>FRL</span> Upload
          </h1>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--bg)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-sm text-red-600">Incorrect password.</p>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded text-white text-sm font-medium"
              style={{ background: 'var(--accent)' }}
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--bg-card)] rounded p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: 'var(--font-barlow, sans-serif)' }}>
            <span style={{ color: 'var(--accent)' }}>FRL</span> Upload CSV
          </h1>
          <a href="/" className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
            ← Back
          </a>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-semibold mb-2">Upload successful!</p>
            <p className="text-sm text-[var(--fg-muted)] mb-6">The CSV has been saved and the session has been created.</p>
            <div className="flex gap-3 justify-center">
              <a href="/" className="px-4 py-2 rounded text-white text-sm font-medium" style={{ background: 'var(--accent)' }}>
                View leaderboard
              </a>
              <button
                onClick={() => setSuccess(false)}
                className="px-4 py-2 rounded text-sm font-medium border border-[var(--border)]"
              >
                Upload another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1">
                Session name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="e.g. Race 1 — Spa"
                required
                className="w-full border border-[var(--border)] bg-[var(--bg)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1">
                Track
              </label>
              <input
                type="text"
                value={trackName}
                onChange={e => setTrackName(e.target.value)}
                placeholder="e.g. Spa-Francorchamps"
                className="w-full border border-[var(--border)] bg-[var(--bg)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-1">
                CSV file <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                required
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-[var(--fg-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:text-white file:cursor-pointer"
                style={{ ['--file-bg' as string]: 'var(--accent)' }}
              />
              <style>{`input[type="file"]::file-selector-button { background: var(--accent); color: white; }`}</style>
            </div>

            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-[var(--fg-muted)] mb-1">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: 'var(--accent)' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="px-3 py-2 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file || !sessionName.trim()}
              className="px-4 py-2 rounded text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: 'var(--accent)' }}
            >
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
