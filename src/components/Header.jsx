import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-warm-white/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="font-serif text-xl font-medium text-dark-brown">
          DIY Courses
        </h1>
        <button
          id="sign-out-btn"
          onClick={handleSignOut}
          className="text-sm text-muted-tan hover:text-terracotta transition-colors font-medium"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
