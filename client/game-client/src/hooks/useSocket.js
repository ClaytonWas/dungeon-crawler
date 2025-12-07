import { useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore'
import toast from 'react-hot-toast'

// Dynamically determine game server URL based on current browser location
// This allows the same build to work on localhost AND LAN
// Always use current hostname - this ensures LAN clients connect to the right server
const GAME_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3030`

export function useSocket(ticket, onTicketInvalid) {
  const store = useGameStore()
  
  useEffect(() => {
    if (!ticket) return
    
    const socket = io(GAME_SERVER_URL, {
      auth: { ticket }
    })
    
    store.setSocket(socket)
    
    socket.on('connect', () => {
      store.setConnected(true)
      console.log('Connected to game server')
    })
    
    socket.on('disconnect', () => {
      store.setConnected(false)
      console.log('Disconnected from game server')
    })
    
    // Handle force disconnect (kicked by another session)
    socket.on('forceDisconnect', ({ reason }) => {
      console.log('Force disconnected:', reason)
      toast.error(reason || 'You have been disconnected.')
      // Clear stored character so we get fresh data on reconnect
      localStorage.removeItem('selectedCharacterId')
      // Redirect to profile page
      setTimeout(() => {
        window.location.href = `${window.location.protocol}//${window.location.hostname}:3000`
      }, 2000)
    })
    
    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message)
      if (err.message === 'Invalid Ticket' || err.message === 'Authentication Required') {
        toast.error('Session expired. Refreshing access...')
        onTicketInvalid?.()
      } else {
        toast.error('Failed to connect to game server')
      }
    })
    
    socket.on('welcome', (message) => {
      console.log(message)
    })
    
    socket.on('yourPlayerId', (playerId) => {
      store.setPlayerId(playerId)
      console.log('My player ID:', playerId)
      
      // Check if we have a previously selected character stored
      const savedCharacterId = localStorage.getItem('selectedCharacterId')
      if (savedCharacterId) {
        console.log('Restoring saved character:', savedCharacterId)
        socket.emit('selectCharacter', savedCharacterId)
      }
      // Server automatically sends areaPlayers after connection
    })
    
    // Character management
    socket.on('userCharacters', (characters) => {
      store.setCharacters(characters)
    })
    
    socket.on('currentCharacterId', (id) => {
      store.setCurrentCharacterId(id)
      // Save to localStorage so it persists across refreshes
      if (id) {
        localStorage.setItem('selectedCharacterId', id)
      }
    })
    
    socket.on('characterCreated', (result) => {
      if (result.success) {
        toast.success(`Character "${result.character.name}" created!`)
      } else {
        toast.error(`Failed to create character: ${result.error}`)
      }
    })
    
    socket.on('characterSelected', (result) => {
      if (result.success) {
        store.setCurrentCharacterId(result.characterId)
        // Save to localStorage so it persists across refreshes
        localStorage.setItem('selectedCharacterId', result.characterId)
        // Server broadcasts playerUpdated to all nearby players automatically
        toast.success('Character switched!')
      } else {
        toast.error(`Failed to select character: ${result.error}`)
      }
    })
    
    socket.on('primaryCharacterSet', (result) => {
      if (result.success) {
        toast.success('Primary character set!')
      } else {
        toast.error(`Failed to set primary: ${result.error}`)
      }
    })
    
    socket.on('characterDeleted', (result) => {
      if (result.success) {
        toast.success('Character deleted')
      } else {
        toast.error(`Failed to delete: ${result.error}`)
      }
    })
    
    // Party management
    socket.on('partyCreated', (data) => {
      const currentPlayerId = useGameStore.getState().playerId
      store.setParty(data.partyId, [{ id: currentPlayerId, username: 'You' }], currentPlayerId)
      toast.success(`Party created! ID: ${data.partyId}`)
    })
    
    socket.on('joinPartyResponse', (result) => {
      if (result.success) {
        toast.success(`Joined party!`)
      } else {
        toast.error(`Failed to join: ${result.message}`)
      }
    })
    
    socket.on('partyUpdated', (data) => {
      store.setParty(data.partyId, data.members, data.leaderId)
    })
    
    socket.on('leftParty', () => {
      store.clearParty()
      toast.success('Left party')
    })
    
    // Hub/Dungeon events
    socket.on('enterHubWorld', (data) => {
      console.log('Entered hub world')
      store.setInHubWorld(true)
    })
    
    socket.on('returnToHubWorld', (data) => {
      console.log('Returned to hub world', data)
      // Clear dungeon state
      store.setInHubWorld(true)
      store.setEnemies([])
      store.setTargetedEnemies([])
      store.clearDamageNumbers()
      
      // Server will send areaPlayers with updated hub state
      // and playerJoined for this player to others
    })
    
    // MMO-style area state - receive all players in current area
    socket.on('areaPlayers', (players) => {
      console.log('Area players received:', players.length, 'players')
      store.clearPlayers()
      const playersMap = {}
      players.forEach(p => { 
        playersMap[p.id] = p 
        console.log('Player in area:', p.id, p.username, p.shape, p.color)
      })
      store.setPlayers(playersMap)
    })
    
    // MMO-style real-time events
    socket.on('playerJoined', (player) => {
      console.log('Player joined:', player.username)
      store.updatePlayer(player.id, player)
    })
    
    socket.on('playerLeft', (data) => {
      console.log('Player left:', data.id)
      store.removePlayer(data.id)
    })
    
    socket.on('playerMoved', (data) => {
      // Always update store with server position for ALL players
      // This keeps positions in sync - the client-side rendering handles smooth interpolation
      store.updatePlayer(data.id, { position: data.position })
    })
    
    socket.on('playerUpdated', (player) => {
      console.log('Player updated:', player.username, player.shape, player.color)
      store.updatePlayer(player.id, player)
    })
    
    // Legacy support for hub world players (fallback)
    socket.on('hubWorldPlayers', (players) => {
      console.log('Hub world players (legacy):', players.length)
      store.clearPlayers()
      const playersMap = {}
      players.forEach(p => { 
        playersMap[p.id] = p 
      })
      store.setPlayers(playersMap)
    })
    
    socket.on('enterDungeonRoom', (data) => {
      console.log('Entering dungeon room:', data)
      store.setInDungeon(true)
      store.setEnemies(data.enemies || [])
      // Clear existing players and set party members
      store.clearPlayers()
      const playersMap = {}
      if (data.partyMembers) {
        data.partyMembers.forEach(p => { 
          // Ensure position exists
          if (!p.position) {
            p.position = { x: 0, y: 0.5, z: 0 }
          }
          playersMap[p.id] = p 
          console.log('Party member in dungeon:', p.id, p.shape, p.color, p.position)
        })
      }
      store.setPlayers(playersMap)
      console.log('Players set for dungeon:', playersMap)
    })
    
    socket.on('startDungeonResponse', (result) => {
      if (!result.success) {
        toast.error(`Failed to start: ${result.message}`)
      }
    })
    
    // Player data (legacy events - keeping for backwards compatibility)
    socket.on('sendPlayerData', (player) => {
      store.updatePlayer(player.id, player)
    })
    
    socket.on('broadcastPlayerPosition', (data) => {
      store.updatePlayer(data.id, { position: data.position })
    })
    
    socket.on('userDisconnected', (id) => {
      console.log('User disconnected (legacy):', id)
      store.removePlayer(id)
    })
    
    // Combat
    socket.on('enemyMoved', (data) => {
      store.updateEnemy(data.enemyId, { position: data.position })
    })
    
    socket.on('enemiesTargeted', (data) => {
      // Update which enemies are being targeted
      console.log('Enemies targeted:', data)
      store.setTargetedEnemies(data.enemyIds || data.targetedEnemies || [])
    })
    
    socket.on('enemyDamaged', (data) => {
      console.log('Enemy damaged:', data)
      if (data.attacks) {
        data.attacks.forEach(attack => {
          // Get enemy position BEFORE updating (in case it dies)
          const enemy = useGameStore.getState().enemies.find(e => e.id === attack.enemyId)
          const position = enemy?.position ? { ...enemy.position } : null
          
          console.log('Attack on enemy:', attack.enemyId, 'damage:', attack.damage, 'position:', position)
          
          // Update enemy health
          store.updateEnemy(attack.enemyId, { health: attack.health })
          
          // Add damage number for visual feedback (using stored position)
          if (position) {
            const dmgNum = {
              damage: attack.damage,
              x: position.x + (Math.random() - 0.5) * 0.5,
              y: 2.5,
              z: position.z + (Math.random() - 0.5) * 0.5,
              createdAt: Date.now()
            }
            console.log('Adding damage number:', dmgNum)
            store.addDamageNumber(dmgNum)
          }
        })
      }
    })
    
    socket.on('enemyKilled', (data) => {
      store.removeEnemy(data.enemyId)
      if (data.loot) {
        store.addLoot(data.loot)
      }
    })
    
    socket.on('lootCollected', (data) => {
      store.removeLoot(data.lootId)
    })
    
    socket.on('roomCleared', (data) => {
      console.log('Room cleared:', data)
      toast.success('🏆 Room Cleared! Returning to hub...')
      // Server will automatically send returnToHubWorld
    })
    
    // Stats
    socket.on('characterStats', (stats) => {
      store.setCharacterStats(stats)
    })
    
    socket.on('weaponStats', (stats) => {
      store.setWeaponStats(stats)
    })
    
    socket.on('levelUp', (data) => {
      toast.success(`Level Up! Now level ${data.newLevel}`)
    })
    
    // Chat - Global channel
    socket.on('receiveGlobalMessage', (message, id, username) => {
      store.addGlobalMessage({ id, username, message, timestamp: Date.now(), channel: 'global' })
      
      // Add chat bubble above player's head
      store.addChatBubble(id, message)
      
      // Remove chat bubble after 5 seconds
      setTimeout(() => {
        store.removeChatBubble(id)
      }, 5000)
    })
    
    // Chat - Party channel
    socket.on('receivePartyMessage', (message, id, username) => {
      store.addPartyMessage({ id, username, message, timestamp: Date.now(), channel: 'party' })
      
      // Add chat bubble above player's head
      store.addChatBubble(id, message)
      
      // Remove chat bubble after 5 seconds
      setTimeout(() => {
        store.removeChatBubble(id)
      }, 5000)
    })
    
    // Legacy support for old message format
    socket.on('recieveGlobalUserMessage', (message, id, username) => {
      store.addGlobalMessage({ id, username, message, timestamp: Date.now(), channel: 'global' })
      store.addChatBubble(id, message)
      setTimeout(() => {
        store.removeChatBubble(id)
      }, 5000)
    })
    
    return () => {
      socket.disconnect()
      store.setSocket(null)
      store.setConnected(false)
    }
  }, [ticket, onTicketInvalid])
  
  // Socket actions
  const emit = useCallback((event, ...args) => {
    const socket = useGameStore.getState().socket
    if (socket) {
      socket.emit(event, ...args)
    }
  }, [])
  
  return { emit }
}

