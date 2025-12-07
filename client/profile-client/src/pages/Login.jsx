import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionConflict, setSessionConflict] = useState(false)
  
  const login = useAuthStore(state => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e, forceLogin = false) => {
    e?.preventDefault()
    setError('')
    setSessionConflict(false)
    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, forceLogin })
      })

      const data = await response.json()

      if (response.ok) {
        login(data.user)
        navigate('/home')
      } else if (response.status === 409 && data.code === 'SESSION_EXISTS') {
        setSessionConflict(true)
        setError(`This account is already logged in elsewhere (${data.activeSessions} active session${data.activeSessions > 1 ? 's' : ''}).`)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleForceLogin = () => {
    handleSubmit(null, true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass max-w-md w-full p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 text-blood">
          🏰 Dungeon Crawler
        </h1>
        <p className="text-center text-gray-400 mb-8">Login to your account</p>
        
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
            {sessionConflict && (
              <button
                onClick={handleForceLogin}
                disabled={loading}
                className="mt-3 w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Force Login (Logout Other Sessions)'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blood focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blood focus:border-transparent text-white placeholder-gray-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blood hover:bg-blood/80 text-white font-semibold rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-blood hover:text-blood/80 font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

