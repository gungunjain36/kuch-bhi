'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

function isValidEmail(email: string): boolean {
  // Simple RFC5322-like check suitable for UI validation
  return /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/.test(
    email.trim(),
  )
}

export default function WaitlistForm() {
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [message, setMessage] = React.useState<string>('')
  const [count, setCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/waitlist', { method: 'GET' })
        if (!res.ok) return
        const data = (await res.json()) as { count?: number }
        if (mounted && typeof data.count === 'number') setCount(data.count)
      } catch (_) {
        // ignore
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    try {
      setStatus('loading')
      setMessage('')
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        throw new Error('Request failed')
      }

      setStatus('success')
      setMessage('Thanks! We\'ll notify you once you\'re whitelisted.')
      setEmail('')
      setCount((c) => (typeof c === 'number' ? c + 1 : c))
    } catch (err) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    } finally {
      // keep success/error visible
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          required
          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        />
        <Button
          type="submit"
          size="sm"
          className="h-10 rounded-xl bg-slate-900 px-3 text-white hover:bg-slate-900/90 focus-visible:ring-2 focus-visible:ring-slate-400"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Joining…' : 'Join'}
        </Button>
      </form>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600" aria-live="polite">
        <p>
          {message && (
            <span className={status === 'error' ? 'text-red-600' : 'text-emerald-700'}>{message}</span>
          )}
        </p>
        {typeof count === 'number' && (
          <p className="text-slate-700">{count.toLocaleString()} already joined</p>
        )}
      </div>
    </div>
  )
}


