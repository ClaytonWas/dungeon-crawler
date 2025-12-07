import { useState, useEffect, useCallback } from 'react'
import { useSocket } from './hooks/useSocket'
import { useGameStore } from './stores/gameStore'
import GameCanvas from './components/GameCanvas'
import RightPanel from './components/RightPanel'

// Dynamically determine profile server URL based on current browser location
// This allows the same build to work on localhost AND LAN
// Always use current hostname - this ensures LAN clients connect to the right server
const PROFILE_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3000`

function App() {
  const [playTicket, setPlayTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const { connected, panelCollapsed, setPanelCollapsed } = useGameStore()
  
  const fetchTokenFromProfile = useCallback(async () => {
    try {
      const response = await fetch(`${PROFILE_SERVER_URL}/api/play-ticket`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Not authenticated')
      }
      const data = await response.json()
      if (data.ticket) {
        setPlayTicket(data.ticket)
        return true
      }
      throw new Error('Ticket missing')
    } catch (error) {
      console.error('Failed to fetch play ticket:', error)
      window.location.href = `${PROFILE_SERVER_URL}/login`
      return false
    } finally {
      setLoading(false)
    }
  }, [])
  
  const handleTokenInvalid = useCallback(async () => {
    setLoading(true)
    setPlayTicket(null)
    await fetchTokenFromProfile()
  }, [fetchTokenFromProfile])
  
  useEffect(() => {
    fetchTokenFromProfile()
  }, [fetchTokenFromProfile])
  
  // Initialize socket connection
  useSocket(playTicket, handleTokenInvalid)
  
  if (!playTicket || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="h-screen w-screen flex relative" style={{ overflow: 'hidden' }}>
      {/* Game Canvas */}
      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        <GameCanvas />
        
        {/* Connection status */}
        <div 
          className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${
            connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}
          style={{ zIndex: 1000 }}
        >
          {connected ? '● Connected' : '○ Disconnected'}
        </div>
        
        {/* FPS Counter */}
        <div 
          className="absolute top-4 left-4 mt-10 px-3 py-1 rounded-full text-xs font-semibold bg-gray-900/50 text-gray-300"
          style={{ zIndex: 1000 }}
          id="fps-counter"
        >
          FPS: 0
        </div>
      </div>
      
      {/* Right Panel - slides in/out instead of disappearing */}
      <RightPanel />
      
      {/* Collapsed Panel Button - rendered at root level */}
      {panelCollapsed && (
        <button
          onClick={() => setPanelCollapsed(false)}
          className="fixed right-0 top-1/2 -translate-y-1/2 px-3 py-6 glass rounded-l-lg hover:bg-blood/50 transition-colors shadow-lg"
          style={{ zIndex: 10000 }}
          title="Show Panel"
        >
          <span className="text-white text-xl">◄</span>
        </button>
      )}
    </div>
  )
}

export default App

