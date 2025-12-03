import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleEnterGame = () => {
    // Redirect to the game client
    window.location.href = 'http://localhost:5173'
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
            <h3 className="text-xl font-bold text-white mb-4">📋 Account Information</h3>
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

          {/* Features */}
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

