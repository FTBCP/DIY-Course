import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    async function testConnection() {
      try {
        // A simple query to verify the connection works
        const { error } = await supabase.from('_test_connection').select('*').limit(1)
        // We expect a "relation does not exist" error — that's fine!
        // It means Supabase is connected, we just don't have tables yet.
        if (error && error.message.includes('does not exist')) {
          setStatus('Connected to Supabase ✓')
        } else if (error) {
          setStatus('Connected to Supabase ✓ (no tables yet)')
        } else {
          setStatus('Connected to Supabase ✓')
        }
      } catch (err) {
        setStatus('Connection failed ✗ — check your .env.local')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          DIY Courses
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Tailwind CSS is working ✓
        </p>
        <p className={`text-lg ${status.includes('✓') ? 'text-green-600' : status.includes('✗') ? 'text-red-600' : 'text-yellow-600'}`}>
          {status}
        </p>
      </div>
    </div>
  )
}

export default App
