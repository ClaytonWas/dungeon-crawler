import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  // Account settings state
  const [showSettings, setShowSettings] = useState(false)
  const [sessions, setSessions] = useState([])
  const [characters, setCharacters] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleEnterGame = () => {
    // Redirect to the game client - use same hostname for LAN compatibility
    window.location.href = `${window.location.protocol}//${window.location.hostname}:5173`
  }

  // Fetch sessions
  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const response = await fetch('/api/sessions', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      }
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Fetch characters
  const fetchCharacters = async () => {
    setLoadingCharacters(true)
    try {
      const response = await fetch('/api/characters', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCharacters(data.characters)
      }
    } catch (err) {
      console.error('Error fetching characters:', err)
    } finally {
      setLoadingCharacters(false)
    }
  }

  // Load data when settings panel opens
  useEffect(() => {
    if (showSettings) {
      fetchSessions()
      fetchCharacters()
    }
  }, [showSettings])

  // Terminate a session
  const terminateSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (response.ok) {
        // Check if we terminated our own session
        const terminated = sessions.find(s => s.id === sessionId)
        if (terminated?.isCurrent) {
          await logout()
          navigate('/login')
        } else {
          fetchSessions()
        }
      }
    } catch (err) {
      console.error('Error terminating session:', err)
    }
  }

  // Logout all other sessions
  const logoutAllOthers = async () => {
    try {
      const response = await fetch('/api/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keepCurrent: true })
      })
      if (response.ok) {
        fetchSessions()
      }
    } catch (err) {
      console.error('Error logging out other sessions:', err)
    }
  }

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    
    setChangingPassword(true)
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setPasswordSuccess('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        fetchSessions() // Refresh sessions (other sessions may have been logged out)
      } else {
        setPasswordError(data.message || 'Error changing password')
      }
    } catch (err) {
      setPasswordError('Network error. Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass max-w-2xl w-full p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 text-blood">
          🏰 Dungeon Crawler
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Welcome back, <span className="text-white font-semibold">{user?.username}</span>!
        </p>

        <div className="space-y-6">
          {/* Game Info */}
          <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🎮 Ready to Play?</h2>
            <p className="text-gray-400 mb-6">
              Enter the dungeon crawler world and battle monsters with Vampire Survivors-style combat!
            </p>
            <button
              onClick={handleEnterGame}
              className="w-full py-4 px-6 bg-blood hover:bg-blood/80 text-white font-bold text-lg rounded-lg shadow-lg transition-colors"
            >
              ⚔️ Enter Game
            </button>
          </div>

          {/* Account Info */}
          <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📋 Account Information</h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {showSettings ? '✕ Close' : '⚙️ Settings'}
              </button>
            </div>
            <div className="space-y-2 text-gray-300">
              <p><span className="text-gray-400">Username:</span> <span className="text-white font-semibold">{user?.username}</span></p>
              <p><span className="text-gray-400">Account ID:</span> <span className="text-white font-mono text-sm">{user?.id}</span></p>
              <p><span className="text-gray-400">Character Shape:</span> <span className="text-white">{user?.shape || 'cube'}</span></p>
              <p className="flex items-center gap-2">
                <span className="text-gray-400">Character Color:</span>
                <span 
                  className="w-6 h-6 rounded border border-gray-600 inline-block"
                  style={{ backgroundColor: user?.color || '#00ff00' }}
                ></span>
                <span className="text-white font-mono text-sm">{user?.color || '#00ff00'}</span>
              </p>
            </div>
          </div>

          {/* Account Settings Panel */}
          {showSettings && (
            <div className="space-y-6">
              {/* Characters */}
              <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">🧙 Your Characters</h3>
                {loadingCharacters ? (
                  <p className="text-gray-400">Loading characters...</p>
                ) : characters.length === 0 ? (
                  <p className="text-gray-400">No characters found.</p>
                ) : (
                  <div className="space-y-3">
                    {characters.map(char => (
                      <div key={char.id} className="flex items-center justify-between bg-black/30 border border-gray-600 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-8 h-8 rounded border border-gray-500"
                            style={{ backgroundColor: char.color }}
                          ></span>
                          <div>
                            <p className="text-white font-semibold">
                              {char.name}
                              {char.isPrimary && <span className="ml-2 text-xs bg-blood px-2 py-0.5 rounded">Primary</span>}
                            </p>
                            <p className="text-gray-400 text-sm">
                              Level {char.level} • {char.shape} • {char.totalKills} kills
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-gray-500 text-sm mt-3">
                  {characters.length}/5 characters • Manage characters in-game
                </p>
              </div>

              {/* Active Sessions */}
              <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">🔐 Active Sessions</h3>
                  {sessions.length > 1 && (
                    <button
                      onClick={logoutAllOthers}
                      className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded transition-colors"
                    >
                      Logout Others
                    </button>
                  )}
                </div>
                {loadingSessions ? (
                  <p className="text-gray-400">Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-gray-400">No active sessions found.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {sessions.map(session => (
                      <div key={session.id} className={`flex items-center justify-between bg-black/30 border rounded-lg p-3 ${session.isCurrent ? 'border-blood' : 'border-gray-600'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">
                            {session.isCurrent && <span className="text-blood font-bold mr-2">● Current</span>}
                            {session.ipAddress}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            Last active: {formatDate(session.lastActivity)}
                          </p>
                        </div>
                        <button
                          onClick={() => terminateSession(session.id)}
                          className="ml-3 px-3 py-1 bg-gray-700 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        >
                          {session.isCurrent ? 'Logout' : 'Terminate'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Password */}
              <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">🔑 Change Password</h3>
                
                {passwordError && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
                    {passwordError}
                  </div>
                )}
                
                {passwordSuccess && (
                  <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg mb-4 text-sm">
                    {passwordSuccess}
                  </div>
                )}
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-white text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-white text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-2 bg-blood hover:bg-blood/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
                <p className="text-gray-500 text-xs mt-3">
                  Changing your password will log out all other sessions.
                </p>
              </div>
            </div>
          )}

          {/* Features */}
          {!showSettings && (
            <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">✨ Game Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li>⚔️ <strong>Vampire Survivors Combat</strong> - Auto-attack with radius targeting</li>
                <li>🌍 <strong>Persistent Hub World</strong> - Meet other players</li>
                <li>🏰 <strong>Instanced Dungeons</strong> - Party-based adventures</li>
                <li>👥 <strong>Party System</strong> - Team up with friends</li>
                <li>💬 <strong>Real-time Chat</strong> - Communicate with your party</li>
                <li>📈 <strong>Character Progression</strong> - Level up and get stronger</li>
                <li>🎨 <strong>Multiple Characters</strong> - Create up to 5 characters</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

