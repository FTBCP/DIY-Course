import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-tan font-semibold mb-4">
            Welcome back
          </p>
          <h1 className="font-serif text-4xl font-medium text-dark-brown tracking-tight">
            Sign in to <em className="text-terracotta italic font-normal">DIY Courses</em>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block font-serif text-lg font-medium text-dark-brown mb-2">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-5 py-4 text-base bg-input-bg border-[1.5px] border-border rounded text-dark-brown placeholder-light-tan focus:outline-none focus:border-terracotta focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block font-serif text-lg font-medium text-dark-brown mb-2">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="w-full px-5 py-4 text-base bg-input-bg border-[1.5px] border-border rounded text-dark-brown placeholder-light-tan focus:outline-none focus:border-terracotta focus:bg-white transition-all"
            />
          </div>

          <button
            id="signin-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-dark-brown text-warm-white py-4 px-6 rounded text-[15px] font-medium tracking-wide hover:bg-terracotta transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-warm-gray text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-terracotta hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
