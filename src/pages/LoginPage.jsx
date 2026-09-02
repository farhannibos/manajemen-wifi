import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { INPUT_CLASS, LABEL_CLASS } from '../lib/ui'
import { IconWifi } from '../components/icons'
import Button from '../components/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Email atau password salah.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-50 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-3">
            <IconWifi className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen WiFi</h1>
          <p className="text-sm text-slate-400 mt-0.5">Kelola pelanggan &amp; tagihan RT/RW Net</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-slate-900/5 border border-slate-100 p-5 space-y-4">
          <div>
            <label className={LABEL_CLASS}>Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </div>
      </form>
    </div>
  )
}
