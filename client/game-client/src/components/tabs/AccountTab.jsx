import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import toast from 'react-hot-toast'

// Profile server URL - always use current hostname for LAN compatibility
const PROFILE_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3000`

export default function AccountTab() {
  const { socket, characters, currentCharacterId, inDungeon } = useGameStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    shape: 'cube',
    color: '#00ff00'
  })
  
  const selectCharacter = (charId) => {
    if (inDungeon) {
      toast.error('Cannot switch characters while in dungeon')
      return
    }
    socket?.emit('selectCharacter', charId)
  }
  
  const setPrimaryCharacter = (charId) => {
    socket?.emit('setPrimaryCharacter', charId)
  }
  
  const deleteCharacter = (charId) => {
    if (characters.length <= 1) {
      toast.error('Cannot delete your last character')
      return
    }
    if (confirm('Are you sure you want to delete this character?')) {
      socket?.emit('deleteCharacter', charId)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${PROFILE_SERVER_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // Clear any locally stored state
      localStorage.removeItem('selectedCharacterId')

      // Disconnect socket to prevent ghost sessions
      socket?.disconnect()

      window.location.href = `${PROFILE_SERVER_URL}/login`
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to log out. Please try again.')
    }
  }
  
  const createCharacter = (e) => {
    e.preventDefault()
    if (!newCharacter.name.trim()) {
      toast.error('Please enter a character name')
      return
    }
    socket?.emit('createCharacter', newCharacter)
    setNewCharacter({ name: '', shape: 'cube', color: '#00ff00' })
    setShowCreateForm(false)
  }
  
  return (
    <div className="space-y-6">
      {/* Characters Section */}
      <div className="glass rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-crimson font-semibold uppercase tracking-wider text-sm">
            My Characters
          </h3>
          <span className="text-xs text-gray-500">{characters.length}/5</span>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {characters.map(char => (
            <CharacterCard
              key={char.id}
              character={char}
              isActive={char.id === currentCharacterId}
              onSelect={() => selectCharacter(char.id)}
              onSetPrimary={() => setPrimaryCharacter(char.id)}
              onDelete={() => deleteCharacter(char.id)}
              disabled={inDungeon}
            />
          ))}
        </div>
        
        {characters.length < 5 && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full mt-4 btn-primary"
          >
            + Create New Character
          </button>
        )}
        
        {/* Create Character Form */}
        {showCreateForm && (
          <form onSubmit={createCharacter} className="mt-4 p-4 bg-black/20 rounded-lg space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase">Name</label>
              <input
                type="text"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                placeholder="Character name"
                maxLength={20}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase">Shape</label>
              <select
                value={newCharacter.shape}
                onChange={(e) => setNewCharacter({ ...newCharacter, shape: e.target.value })}
                className="input-field"
              >
                <option value="cube">Cube</option>
                <option value="sphere">Sphere</option>
                <option value="cone">Cone</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase">Color</label>
              <input
                type="color"
                value={newCharacter.color}
                onChange={(e) => setNewCharacter({ ...newCharacter, color: e.target.value })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="flex-1 btn-primary">
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      
      {/* Account Actions */}
      <div className="glass rounded-lg p-4">
        <h3 className="text-crimson font-semibold mb-4 uppercase tracking-wider text-sm">
          Account
        </h3>
        
        <div className="space-y-2">
          <a
            href={`${PROFILE_SERVER_URL}/home`}
            className="block w-full text-center btn-secondary"
          >
            🏠 Main Menu
          </a>
          <button
            onClick={handleLogout}
            className="w-full text-center btn-secondary"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  )
}

function CharacterCard({ character, isActive, onSelect, onSetPrimary, onDelete, disabled }) {
  const colorHex = '#' + character.color.toString(16).padStart(6, '0')
  const expPercent = Math.floor((character.experience / character.experienceToNextLevel) * 100)
  
  return (
    <div className={`p-3 rounded-lg border transition-all ${
      isActive 
        ? 'bg-blood/30 border-crimson' 
        : 'bg-black/20 border-blood/20 hover:border-blood/40'
    }`}>
      <div className="flex items-center gap-3">
        {/* Color preview */}
        <div 
          className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0"
          style={{ backgroundColor: colorHex }}
        />
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white truncate">{character.name}</span>
            {character.isPrimary && (
              <span className="text-xs text-dark-gold">★</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Lv. {character.level}</span>
            <span>Kills: {character.totalKills || 0}</span>
            <span>Exp: {expPercent}%</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {isActive ? (
          <span className="text-xs text-crimson font-semibold uppercase">Active</span>
        ) : (
          <button
            onClick={onSelect}
            disabled={disabled}
            className="text-xs px-3 py-1 bg-blood/50 hover:bg-blood/70 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select
          </button>
        )}
        
        {!character.isPrimary && (
          <button
            onClick={onSetPrimary}
            className="text-xs px-3 py-1 bg-dark-gold/50 hover:bg-dark-gold/70 rounded transition-colors"
          >
            Set Primary
          </button>
        )}
        
        <button
          onClick={onDelete}
          className="text-xs px-3 py-1 bg-gray-700/50 hover:bg-red-900/70 rounded transition-colors ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

