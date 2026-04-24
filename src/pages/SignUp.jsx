import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-tan font-semibold mb-4">
            Almost there
          </p>
          <h1 className="font-serif text-3xl font-medium text-dark-brown tracking-tight mb-4">
            Check your email
          </h1>
          <p className="text-warm-gray text-base mb-8">
            We sent a confirmation link to <strong className="text-dark-brown">{email}</strong>. Click the link to activate your account, then come back and sign in.
          </p>
          <Link
            to="/signin"
            className="inline-block bg-dark-brown text-warm-white py-3 px-6 rounded text-[15px] font-medium hover:bg-terracotta transition-all"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-tan font-semibold mb-4">
            Get started
          </p>
          <h1 className="font-serif text-4xl font-medium text-dark-brown tracking-tight">
            Create your <em className="text-terracotta italic font-normal">account</em>
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
              id="signup-email"
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
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              className="w-full px-5 py-4 text-base bg-input-bg border-[1.5px] border-border rounded text-dark-brown placeholder-light-tan focus:outline-none focus:border-terracotta focus:bg-white transition-all"
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-dark-brown text-warm-white py-4 px-6 rounded text-[15px] font-medium tracking-wide hover:bg-terracotta transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-warm-gray text-sm">
          Already have an account?{' '}
          <Link to="/signin" className="text-terracotta hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
