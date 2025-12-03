const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')

// Import modular systems
const weaponSystem = require('./systems/weaponSystem')
const characterUpgrades = require('./systems/characterUpgrades')
const accountUpgrades = require('./systems/accountUpgrades')
const characterManager = require('./systems/characterManager')
const combatSystem = require('./systems/combatSystem')

// Config
const SHIP = {
    PORT: process.env.PORT || process.env.GAME_SERVER_PORT || 3030,
    PROFILE_SERVER: process.env.PROFILE_SERVER_URL || 'http://localhost:3000',
    PROFILE_API: process.env.PROFILE_API_URL || 'http://profile-api:3001',
    MAX_PARTY_SIZE: 4,
    TICK_RATE: 60 // Server tick rate (updates per second)
}

// Globals
const playersInServer = new Map() // Map of userId -> {player data + selectedCharacterId}
const userSelectedCharacters = new Map() // Map of userId -> characterId (currently selected character)
const parties = new Map() // Map of partyId -> {members: Set<socket>, leader: socket, dungeonRoom: string}
const dungeonRooms = new Map() // Map of roomId -> {enemies: [], loot: [], cleared: boolean}
const playerToParty = new Map() // Map of socket -> partyId
const playerToRoom = new Map() // Map of socket -> roomId
const hubWorldPlayers = new Set() // Players currently in hub world

// Default dungeon room
const defaultDungeonRoom = require('./scenes/dungeon_corridor.json')

// Server
const app = express()
const server = http.createServer(app)

// CORS configuration
const normalizeUrl = (url) => {
    if (!url) return null
    return url.replace(/\/$/, '')
}

const allowedOrigins = []
if (SHIP.PROFILE_SERVER) {
    const normalized = normalizeUrl(SHIP.PROFILE_SERVER)
    if (normalized) {
        allowedOrigins.push(normalized)
    }
}
if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
        const normalized = normalizeUrl(origin.trim())
        if (normalized && !allowedOrigins.includes(normalized)) {
            allowedOrigins.push(normalized)
        }
    })
}
allowedOrigins.push('http://localhost:3000')
allowedOrigins.push('http://127.0.0.1:3000')
allowedOrigins.push('http://localhost:5173')
allowedOrigins.push('http://127.0.0.1:5173')

console.log('Allowed CORS origins:', allowedOrigins)

const checkOrigin = (origin) => {
    if (!origin) return true
    const normalized = normalizeUrl(origin)
    return allowedOrigins.includes(normalized) || allowedOrigins.includes(origin)
}

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (checkOrigin(origin)) {
                callback(null, true)
            } else {
                console.warn(`CORS blocked: ${origin}`)
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
})

app.use(cors({
    origin: (origin, callback) => {
        if (checkOrigin(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    methods: ["GET", "POST"],
    credentials: true
}))

app.use(express.static(path.join(__dirname)))

// Scene API endpoint
app.get('/api/scenes/:sceneId', (req, res) => {
    const sceneId = req.params.sceneId
    const scenePath = path.join(__dirname, './scenes', `${sceneId}.json`)
    
    // Check if scene file exists
    if (!fs.existsSync(scenePath)) {
        return res.status(404).json({ error: 'Scene not found', sceneId })
    }
    
    try {
        const sceneData = JSON.parse(fs.readFileSync(scenePath, 'utf8'))
        res.json(sceneData)
    } catch (error) {
        console.error(`[Scene API] Error loading scene: ${sceneId}`, error)
        res.status(500).json({ error: 'Failed to load scene', sceneId })
    }
})

// Loading textures
app.get('/textures', (req, res) => {
    const texturesPath = path.join(__dirname, './textures')
    fs.readdir(texturesPath, (error, files) => {
        if (error) {
            console.error('Error reading textures directory:', error)
            return res.status(500).json({ error: 'Unable to load textures.' })
        }
        const textures = files.filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file))
        res.json(textures)
    })
})

// Authenticating Users via play tickets
io.use(async (socket, next) => {
    try {
        const ticket = socket.handshake.auth?.ticket
        if (!ticket) {
            return next(new Error('Authentication Required'))
        }

        const response = await fetch(`${SHIP.PROFILE_API}/api/play-ticket/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticket })
        })

        if (!response.ok) {
            if (response.status === 401) {
                return next(new Error('Invalid Ticket'))
            }
            return next(new Error('Authentication Service Unavailable'))
        }

        const data = await response.json()
        if (!data || !data.user || !data.user.id || !data.user.username) {
            return next(new Error('Invalid User'))
        }

        socket.user = data.user
        next()
    } catch (error) {
        console.error('[Auth] Ticket validation failed:', error)
        next(new Error('Authentication Service Unavailable'))
    }
})

// Party Management
const partyManager = {
    createParty: (leaderSocket) => {
        const partyId = `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const party = {
            id: partyId,
            members: new Set([leaderSocket]),
            leader: leaderSocket,
            dungeonRoom: null,
            roomId: null
        }
        parties.set(partyId, party)
        playerToParty.set(leaderSocket, partyId)
        console.log(`Party ${partyId} created by ${leaderSocket.user.username}`)
        return partyId
    },

    joinParty: (socket, partyId) => {
        const party = parties.get(partyId)
        if (!party) {
            return { success: false, message: 'Party not found' }
        }
        if (party.members.size >= SHIP.MAX_PARTY_SIZE) {
            return { success: false, message: 'Party is full' }
        }
        if (party.members.has(socket)) {
            return { success: false, message: 'Already in party' }
        }
        
        party.members.add(socket)
        playerToParty.set(socket, partyId)
        
        // Notify all party members
        party.members.forEach(member => {
            member.emit('partyUpdated', {
                partyId: partyId,
                members: Array.from(party.members).map(s => ({
                    id: s.user.id,
                    username: s.user.username
                })),
                leaderId: party.leader.user.id
            })
        })
        
        console.log(`${socket.user.username} joined party ${partyId}`)
        return { success: true, partyId: partyId }
    },

    leaveParty: (socket) => {
        const partyId = playerToParty.get(socket)
        if (!partyId) return
        
        const party = parties.get(partyId)
        if (!party) return
        
        const roomId = playerToRoom.get(socket)
        
        party.members.delete(socket)
        playerToParty.delete(socket)
        
        // Return to hub world if leaving party
        if (roomId) {
            playerToRoom.delete(socket)
            hubWorldPlayers.add(socket)
            socket.emit('returnToHubWorld', {
                playersInHub: Array.from(hubWorldPlayers).map(s => ({
                    id: s.user.id,
                    username: s.user.username
                }))
            })
        }
        
        // If leader left, assign new leader or disband
        if (party.leader === socket && party.members.size > 0) {
            party.leader = Array.from(party.members)[0]
            console.log(`New leader assigned: ${party.leader.user.username}`)
        }
        
        // Notify remaining members
        party.members.forEach(member => {
            member.emit('partyUpdated', {
                partyId: partyId,
                members: Array.from(party.members).map(s => ({
                    id: s.user.id,
                    username: s.user.username
                })),
                leaderId: party.leader.user.id
            })
        })
        
        // Disband if empty
        if (party.members.size === 0) {
            parties.delete(partyId)
            console.log(`Party ${partyId} disbanded`)
        } else {
            console.log(`${socket.user.username} left party ${partyId}`)
        }
    },

    startDungeon: (partyId) => {
        const party = parties.get(partyId)
        if (!party || party.members.size === 0) return false
        
        const roomId = `room_${Date.now()}`
        const room = {
            id: roomId,
            enemies: [],
            loot: [],
            cleared: false,
            partyId: partyId
        }
        
        // Initialize enemies for the room
        const enemyCount = Math.min(party.members.size * 2, 8) // 2 enemies per player, max 8
        for (let i = 0; i < enemyCount; i++) {
            room.enemies.push({
                id: `enemy_${roomId}_${i}`,
                type: 'goblin',
                health: 50,
                maxHealth: 50,
                position: {
                    x: (Math.random() - 0.5) * 15,
                    y: 0.5,
                    z: (Math.random() - 0.5) * 15
                },
                attackCooldown: 0
            })
        }
        
        dungeonRooms.set(roomId, room)
        party.roomId = roomId
        
        // BROADCAST: Tell hub players that these party members are leaving
        party.members.forEach(socket => {
            // Tell all OTHER hub players this player is leaving
            hubWorldPlayers.forEach(hubSocket => {
                if (hubSocket !== socket) {
                    hubSocket.emit('playerLeft', { id: socket.user.id })
                }
            })
            
            // Remove from hub world
            hubWorldPlayers.delete(socket)
        })
        
        // Move all party members to the dungeon room
        party.members.forEach(socket => {
            playerToRoom.set(socket, roomId)
            
            // Get full player data including shape and color
            const partyMembersData = Array.from(party.members).map(s => {
                const playerData = playersInServer.get(s.user.id)
                return {
                    id: s.user.id,
                    username: s.user.username,
                    shape: playerData?.shape || 'cube',
                    color: playerData?.color || 0x00ff00,
                    position: playerData?.position || {x: 0, y: 0.5, z: 0}
                }
            })
            
            socket.emit('enterDungeonRoom', {
                roomId: roomId,
                roomData: defaultDungeonRoom,
                enemies: room.enemies,
                partyMembers: partyMembersData
            })
        })
        
        console.log(`Party ${partyId} entered dungeon room ${roomId}`)
        return true
    }
}

// Weapon System is now imported from ./systems/weaponSystem.js

// Combat logic is implemented in server/systems/combatSystem.js

// Enemy AI - runs on server tick
const enemyAI = {
    update: () => {
        dungeonRooms.forEach((room, roomId) => {
            room.enemies.forEach(enemy => {
                // Update attack cooldown
                if (enemy.attackCooldown > 0) {
                    enemy.attackCooldown -= (1000 / SHIP.TICK_RATE)
                }
                
                // Find nearest player
                const party = parties.get(room.partyId)
                if (!party) return
                
                let nearestPlayer = null
                let nearestDistance = Infinity
                
                party.members.forEach(socket => {
                    const player = playersInServer.get(socket.user.id)
                    if (!player || player.health <= 0) return
                    
                    const distance = Math.sqrt(
                        Math.pow(enemy.position.x - player.position.x, 2) +
                        Math.pow(enemy.position.z - player.position.z, 2)
                    )
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance
                        nearestPlayer = socket
                    }
                })
                
                // Move towards nearest player or attack if close enough
                if (nearestPlayer && nearestDistance < 2 && enemy.attackCooldown <= 0) {
                    combatSystem.enemyAttackPlayer(enemy, nearestPlayer)
                    enemy.attackCooldown = 2000 // 2 second cooldown
                } else if (nearestPlayer && nearestDistance > 2) {
                    // Move towards player
                    const player = playersInServer.get(nearestPlayer.user.id)
                    const direction = {
                        x: player.position.x - enemy.position.x,
                        z: player.position.z - enemy.position.z
                    }
                    const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z)
                    if (length > 0) {
                        const speed = 0.05
                        enemy.position.x += (direction.x / length) * speed
                        enemy.position.z += (direction.z / length) * speed
                        
                        // Broadcast enemy movement
                        party.members.forEach(member => {
                            member.emit('enemyMoved', {
                                enemyId: enemy.id,
                                position: enemy.position
                            })
                        })
                    }
                }
            })
        })
    }
}

// Player Management - MMO-style with real-time broadcasts
const playerMonitor = {
    // Get serializable player data for network transmission
    getPlayerData: (socket) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return null
        return {
            id: player.id,
            username: player.username,
            characterId: player.characterId,
            shape: player.shape,
            color: player.color,
            position: player.position,
            level: player.level,
            health: player.health,
            maxHealth: player.maxHealth
        }
    },
    
    // Broadcast to all players in the same area (hub or dungeon room)
    broadcastToArea: (socket, event, data, includeSelf = false) => {
        const roomId = playerToRoom.get(socket)
        
        if (roomId) {
            // In dungeon - broadcast to party members
            const room = dungeonRooms.get(roomId)
            if (room) {
                const party = parties.get(room.partyId)
                if (party) {
                    party.members.forEach(memberSocket => {
                        if (includeSelf || memberSocket !== socket) {
                            memberSocket.emit(event, data)
                        }
                    })
                }
            }
        } else if (hubWorldPlayers.has(socket)) {
            // In hub world - broadcast to all hub players
            hubWorldPlayers.forEach(memberSocket => {
                if (includeSelf || memberSocket !== socket) {
                    memberSocket.emit(event, data)
                }
            })
        }
    },
    
    // Broadcast to ALL hub world players (for join/leave events)
    broadcastToHub: (event, data) => {
        hubWorldPlayers.forEach(memberSocket => {
            memberSocket.emit(event, data)
        })
    },

    addToPlayerMap: async (socket, characterId = null) => {
        const userId = socket.user.id
        
        // Get user's characters (pass account shape and color for default character creation)
        const characters = characterManager.getUserCharacters(userId, socket.user.shape, socket.user.color)
        
        // Determine which character to use
        let selectedCharacter = null
        
        if (characterId) {
            selectedCharacter = characterManager.getCharacter(userId, characterId)
        }
        
        if (!selectedCharacter) {
            selectedCharacter = characterManager.getPrimaryCharacter(userId)
            if (selectedCharacter) {
                characterId = selectedCharacter.id
            }
        }
        
        if (!selectedCharacter) {
            selectedCharacter = characterManager.createCharacter(userId, 'My Character')
            selectedCharacter.isPrimary = true
            characterId = selectedCharacter.id
        }
        
        userSelectedCharacters.set(userId, characterId)
        
        // Initialize player with character data
        const player = {
            id: socket.user.id,
            username: socket.user.username,
            characterId: characterId,
            shape: selectedCharacter.shape,
            color: selectedCharacter.color,
            position: {x: 0, y: 0.5, z: 0},
            weaponType: selectedCharacter.weaponType || 'basic',
            lastAttackTime: 0,
            level: selectedCharacter.level,
            experience: selectedCharacter.experience,
            experienceToNextLevel: selectedCharacter.experienceToNextLevel,
            maxHealth: selectedCharacter.baseMaxHealth,
            health: selectedCharacter.baseMaxHealth,
            maxMana: selectedCharacter.baseMaxMana,
            mana: selectedCharacter.baseMaxMana,
            movementSpeed: selectedCharacter.baseMovementSpeed,
            damageMultiplier: selectedCharacter.baseDamageMultiplier,
            defense: selectedCharacter.baseDefense
        }
        
        characterUpgrades.initializeStats(player)
        
        try {
            const accountUpgradesData = await accountUpgrades.getAccountUpgrades(socket.user.id)
            accountUpgrades.applyAccountUpgrades(player, accountUpgradesData)
        } catch (err) {
            console.error('Error loading account upgrades:', err)
        }
        
        playersInServer.set(socket.user.id, player)
        hubWorldPlayers.add(socket)
        
        // Tell this player they entered the hub
        socket.emit('enterHubWorld', { playerId: socket.user.id })
        
        // BROADCAST: Tell ALL hub players about this new player joining
        const playerData = playerMonitor.getPlayerData(socket)
        playerMonitor.broadcastToHub('playerJoined', playerData)
        
        console.log(`[HUB] ${socket.user.username} joined hub world`)
    },

    removeFromPlayerMap: (socket) => {
        const wasInHub = hubWorldPlayers.has(socket)
        
        playersInServer.delete(socket.user.id)
        hubWorldPlayers.delete(socket)
        
        // BROADCAST: Tell all hub players this player left
        if (wasInHub) {
            playerMonitor.broadcastToHub('playerLeft', { id: socket.user.id })
            console.log(`[HUB] ${socket.user.username} left hub world`)
        }
    },

    // Send full state of all players in area to a specific socket
    sendAreaState: (socket) => {
        const roomId = playerToRoom.get(socket)
        
        if (roomId) {
            const room = dungeonRooms.get(roomId)
            if (!room) return
            
            const party = parties.get(room.partyId)
            if (!party) return
            
            const players = []
            party.members.forEach(memberSocket => {
                const playerData = playerMonitor.getPlayerData(memberSocket)
                if (playerData) players.push(playerData)
            })
            socket.emit('areaPlayers', players)
        } else {
            // Hub world - send all hub players
            const players = []
            hubWorldPlayers.forEach(memberSocket => {
                const playerData = playerMonitor.getPlayerData(memberSocket)
                if (playerData) players.push(playerData)
            })
            socket.emit('areaPlayers', players)
        }
    },

    updatePlayerPosition: (socket, delta) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        
        if (!player.position) {
            player.position = { x: 0, y: 0.5, z: 0 }
        }
        
        // Update X and Z position
        player.position.x += delta.x || 0
        player.position.z += delta.z || 0
        
        // Update Y position with validation (anti-cheat)
        const groundLevel = 0.5
        const maxJumpHeight = 3.0 // Max allowed Y offset (anti-cheat)
        
        if (delta.y !== undefined) {
            const targetY = groundLevel + (delta.y || 0)
            
            // Validate Y position (prevent flying exploits)
            if (delta.y >= 0 && delta.y <= maxJumpHeight) {
                player.position.y = targetY
            } else if (delta.y < 0) {
                // Allow falling (negative Y)
                player.position.y = groundLevel
            } else {
                // Possible exploit - clamp to max
                player.position.y = groundLevel + maxJumpHeight
                console.warn(`[ANTI-CHEAT] Player ${socket.user.username} exceeded max jump height`)
            }
        }
        
        // Ensure never below ground
        if (player.position.y < groundLevel) {
            player.position.y = groundLevel
        }
        
        // BROADCAST: Send position update to ALL players in area (including self)
        playerMonitor.broadcastToArea(socket, 'playerMoved', {
            id: player.id,
            position: player.position
        }, true) // includeSelf = true
    },
    
    // Update player appearance and broadcast to all nearby players
    updatePlayerAppearance: (socket) => {
        const playerData = playerMonitor.getPlayerData(socket)
        if (!playerData) return
        
        // BROADCAST: Tell all players in area about appearance change
        playerMonitor.broadcastToArea(socket, 'playerUpdated', playerData, true)
        console.log(`[BROADCAST] ${socket.user.username} appearance updated`)
    }
}

// Inject dependencies into combat system module
combatSystem.configure({
    playersInServer,
    playerToRoom,
    playerToParty,
    dungeonRooms,
    parties,
    weaponSystem,
    characterUpgrades,
    characterManager,
    hubWorldPlayers,
    playerMonitor
})

// Socket.IO connection handling
io.on('connection', async (socket) => {
    const username = socket.user.username
    console.log(`${username} connected`)

    socket.emit('welcome', `Connection established.`)
    socket.emit('yourPlayerId', socket.user.id)
    
    // Send user's characters list
    const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
    const selectedId = userSelectedCharacters.get(socket.user.id)
    socket.emit('userCharacters', characters.map(c => ({
        id: c.id,
        name: c.name,
        shape: c.shape,
        color: c.color,
        level: c.level,
        experience: c.experience,
        experienceToNextLevel: c.experienceToNextLevel,
        totalKills: c.totalKills,
        totalDeaths: c.totalDeaths,
        lastPlayed: c.lastPlayed,
        isPrimary: c.isPrimary
    })))
    socket.emit('currentCharacterId', selectedId)
    
    // Initialize player with character upgrades and account upgrades
    await playerMonitor.addToPlayerMap(socket)
    
    // Send this player the current state of all players in their area
    playerMonitor.sendAreaState(socket)

    socket.on('disconnect', () => {
        console.log(`${username} disconnected`)
        
        // Get room/party info before removing
        const roomId = playerToRoom.get(socket)
        const partyId = playerToParty.get(socket)
        
        // BROADCAST: Notify all players in area about disconnect
        playerMonitor.broadcastToArea(socket, 'playerLeft', { id: socket.user.id }, false)
        
        partyManager.leaveParty(socket)
        playerMonitor.removeFromPlayerMap(socket)
    })

    socket.on('sendGlobalUserMessage', (message) => {
        const partyId = playerToParty.get(socket)
        const isInHub = hubWorldPlayers.has(socket)
        
        if (partyId) {
            // Send to party members (in dungeon)
            const party = parties.get(partyId)
            if (party) {
                party.members.forEach(member => {
                    member.emit('recieveGlobalUserMessage', message, socket.user.id, socket.user.username)
                })
            }
        } else if (isInHub) {
            // Send to all hub world players
            hubWorldPlayers.forEach(hubSocket => {
                hubSocket.emit('recieveGlobalUserMessage', message, socket.user.id, socket.user.username)
            })
        }
    })

    socket.on('updatePlayerPosition', (point) => {
        playerMonitor.updatePlayerPosition(socket, point)
    })
    
    // Character Management Handlers
    socket.on('getUserCharacters', () => {
        const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
        const selectedId = userSelectedCharacters.get(socket.user.id)
        socket.emit('userCharacters', characters.map(c => ({
            id: c.id,
            name: c.name,
            shape: c.shape,
            color: c.color,
            level: c.level,
            experience: c.experience,
            experienceToNextLevel: c.experienceToNextLevel,
            totalKills: c.totalKills,
            totalDeaths: c.totalDeaths,
            lastPlayed: c.lastPlayed,
            isPrimary: c.isPrimary
        })))
        socket.emit('currentCharacterId', selectedId)
    })
    
    socket.on('createCharacter', (data) => {
        try {
            const { name, shape, color } = data
            const colorNum = color ? parseInt(color.replace('#', ''), 16) : 0x00ff00
            const character = characterManager.createCharacter(
                socket.user.id,
                name || 'New Character',
                shape || 'cube',
                colorNum
            )
            socket.emit('characterCreated', {
                success: true,
                character: {
                    id: character.id,
                    name: character.name,
                    shape: character.shape,
                    color: character.color,
                    level: character.level
                }
            })
            
            // Refresh character list
            const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
            const selectedId = userSelectedCharacters.get(socket.user.id)
            socket.emit('userCharacters', characters.map(c => ({
                id: c.id,
                name: c.name,
                shape: c.shape,
                color: c.color,
                level: c.level,
                experience: c.experience,
                experienceToNextLevel: c.experienceToNextLevel,
                totalKills: c.totalKills,
                totalDeaths: c.totalDeaths,
                lastPlayed: c.lastPlayed,
                isPrimary: c.isPrimary
            })))
            socket.emit('currentCharacterId', selectedId)
        } catch (error) {
            socket.emit('characterCreated', { success: false, error: error.message })
        }
    })
    
    socket.on('selectCharacter', async (characterId) => {
        const character = characterManager.getCharacter(socket.user.id, characterId)
        if (!character) {
            socket.emit('characterSelected', { success: false, error: 'Character not found' })
            return
        }
        
        // Store the selected character ID
        userSelectedCharacters.set(socket.user.id, characterId)
        
        // Update player data with new character appearance
        const player = playersInServer.get(socket.user.id)
        if (player) {
            player.characterId = characterId
            player.shape = character.shape
            player.color = character.color
            player.weaponType = character.weaponType || player.weaponType || 'basic'
            player.level = character.level
            player.experience = character.experience
            player.experienceToNextLevel = character.experienceToNextLevel
            player.maxHealth = character.baseMaxHealth
            player.health = character.baseMaxHealth
            player.maxMana = character.baseMaxMana
            player.mana = character.baseMaxMana
            player.movementSpeed = character.baseMovementSpeed
            player.damageMultiplier = character.baseDamageMultiplier
            player.defense = character.baseDefense
            player.lastAttackTime = 0

            characterUpgrades.initializeStats(player)

            try {
                const accountUpgradesData = await accountUpgrades.getAccountUpgrades(socket.user.id)
                accountUpgrades.applyAccountUpgrades(player, accountUpgradesData)
            } catch (err) {
                console.error('Error applying account upgrades on character switch:', err)
            }
            
            // BROADCAST: Tell all players in area about the appearance change
            playerMonitor.updatePlayerAppearance(socket)

            const charStats = characterUpgrades.getCharacterStats(player)
            socket.emit('characterStats', charStats)

            const weaponStats = weaponSystem.getWeaponStatsForDisplay(player)
            socket.emit('weaponStats', weaponStats)
        }
        
        // Refresh character list for this player
        const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
        const selectedId = userSelectedCharacters.get(socket.user.id)
        socket.emit('userCharacters', characters.map(c => ({
            id: c.id,
            name: c.name,
            shape: c.shape,
            color: c.color,
            level: c.level,
            experience: c.experience,
            experienceToNextLevel: c.experienceToNextLevel,
            totalKills: c.totalKills,
            totalDeaths: c.totalDeaths,
            lastPlayed: c.lastPlayed,
            isPrimary: c.isPrimary
        })))
        socket.emit('currentCharacterId', selectedId)
        
        socket.emit('characterSelected', { success: true, characterId })
    })
    
    socket.on('setPrimaryCharacter', (characterId) => {
        const success = characterManager.setPrimaryCharacter(socket.user.id, characterId)
        if (success) {
            socket.emit('primaryCharacterSet', { success: true, characterId })
            
            // Refresh character list
            const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
            const selectedId = userSelectedCharacters.get(socket.user.id)
            socket.emit('userCharacters', characters.map(c => ({
                id: c.id,
                name: c.name,
                shape: c.shape,
                color: c.color,
                level: c.level,
                experience: c.experience,
                experienceToNextLevel: c.experienceToNextLevel,
                totalKills: c.totalKills,
                totalDeaths: c.totalDeaths,
                lastPlayed: c.lastPlayed,
                isPrimary: c.isPrimary
            })))
            socket.emit('currentCharacterId', selectedId)
        } else {
            socket.emit('primaryCharacterSet', { success: false, error: 'Character not found' })
        }
    })
    
    socket.on('deleteCharacter', (characterId) => {
        try {
            const success = characterManager.deleteCharacter(socket.user.id, characterId)
            if (success) {
                socket.emit('characterDeleted', { success: true, characterId })
                
                // If deleted character was selected, switch to first available
                let selectedId = userSelectedCharacters.get(socket.user.id)
                if (selectedId === characterId) {
                    const remainingCharacters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
                    if (remainingCharacters.length > 0) {
                        // Will switch on next connection or manual selection
                        userSelectedCharacters.delete(socket.user.id)
                        selectedId = null
                    }
                }
                
                // Refresh character list
                const characters = characterManager.getUserCharacters(socket.user.id, socket.user.shape, socket.user.color)
                if (selectedId === null || selectedId === characterId) {
                    selectedId = userSelectedCharacters.get(socket.user.id) || null
                }
                socket.emit('userCharacters', characters.map(c => ({
                    id: c.id,
                    name: c.name,
                    shape: c.shape,
                    color: c.color,
                    level: c.level,
                    experience: c.experience,
                    experienceToNextLevel: c.experienceToNextLevel,
                    totalKills: c.totalKills,
                    totalDeaths: c.totalDeaths,
                    lastPlayed: c.lastPlayed,
                    isPrimary: c.isPrimary
                })))
                socket.emit('currentCharacterId', selectedId)
            } else {
                socket.emit('characterDeleted', { success: false, error: 'Character not found' })
            }
        } catch (error) {
            socket.emit('characterDeleted', { success: false, error: error.message })
        }
    })
    
    // Get hub world players
    socket.on('getHubWorldPlayers', () => {
        const hubPlayers = Array.from(hubWorldPlayers).map(s => {
            const player = playersInServer.get(s.user.id)
            return player ? {
                id: player.id,
                username: player.username,
                shape: player.shape,
                color: player.color,
                position: player.position,
                health: player.health,
                maxHealth: player.maxHealth
            } : null
        }).filter(p => p !== null)
        
        socket.emit('hubWorldPlayers', hubPlayers)
    })

    // Party management
    socket.on('createParty', () => {
        const partyId = partyManager.createParty(socket)
        socket.emit('partyCreated', { partyId: partyId })
    })

    socket.on('joinParty', (partyId) => {
        const result = partyManager.joinParty(socket, partyId)
        socket.emit('joinPartyResponse', result)
    })

    socket.on('leaveParty', () => {
        partyManager.leaveParty(socket)
        socket.emit('leftParty')
    })

    socket.on('startDungeon', () => {
        const partyId = playerToParty.get(socket)
        if (!partyId) {
            socket.emit('startDungeonResponse', { success: false, message: 'You must be in a party' })
            return
        }
        
        const party = parties.get(partyId)
        if (party.leader !== socket) {
            socket.emit('startDungeonResponse', { success: false, message: 'Only the party leader can start' })
            return
        }
        
        const success = partyManager.startDungeon(partyId)
        socket.emit('startDungeonResponse', { success: success })
    })

    // Combat
    socket.on('attackEnemy', (enemyId) => {
        const result = combatSystem.attackEnemy(socket, enemyId)
        socket.emit('attackEnemyResponse', result)
    })
    
    // ========== WEAPON SYSTEM HANDLERS ==========
    
    // Get weapon stats (for UI/upgrade display)
    socket.on('getWeaponStats', () => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const stats = weaponSystem.getWeaponStatsForDisplay(player)
        socket.emit('weaponStats', stats)
    })
    
    // Upgrade weapon (in-match upgrades)
    socket.on('upgradeWeapon', (data) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) {
            socket.emit('upgradeWeaponResponse', { success: false, error: 'Player not found' })
            return
        }
        
        const { upgradeType, amount } = data
        const success = weaponSystem.upgradeWeapon(player, upgradeType, amount)
        
        if (success) {
            const stats = weaponSystem.getWeaponStatsForDisplay(player)
            socket.emit('weaponStats', stats)
        }
        socket.emit('upgradeWeaponResponse', { success: success })
    })
    
    // Change weapon type
    socket.on('changeWeapon', (weaponType) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) {
            socket.emit('changeWeaponResponse', { success: false, error: 'Player not found' })
            return
        }
        
        const success = weaponSystem.changeWeapon(player, weaponType)
        if (success) {
            const stats = weaponSystem.getWeaponStatsForDisplay(player)
            socket.emit('weaponStats', stats)
        }
        socket.emit('changeWeaponResponse', { success: success })
    })
    
    // ========== CHARACTER UPGRADES HANDLERS (IN-MATCH) ==========
    
    // Get character stats
    socket.on('getCharacterStats', () => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const stats = characterUpgrades.getCharacterStats(player)
        socket.emit('characterStats', stats)
    })
    
    // Upgrade character health
    socket.on('upgradeHealth', (amount) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const success = characterUpgrades.upgradeHealth(player, amount)
        if (success) {
            const stats = characterUpgrades.getCharacterStats(player)
            socket.emit('characterStats', stats)
        }
        socket.emit('upgradeHealthResponse', { success: success })
    })
    
    // Upgrade movement speed
    socket.on('upgradeMovementSpeed', (multiplier) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const success = characterUpgrades.upgradeMovementSpeed(player, multiplier)
        if (success) {
            const stats = characterUpgrades.getCharacterStats(player)
            socket.emit('characterStats', stats)
        }
        socket.emit('upgradeMovementSpeedResponse', { success: success })
    })
    
    // Upgrade damage multiplier
    socket.on('upgradeDamageMultiplier', (multiplier) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const success = characterUpgrades.upgradeDamageMultiplier(player, multiplier)
        if (success) {
            const stats = characterUpgrades.getCharacterStats(player)
            socket.emit('characterStats', stats)
        }
        socket.emit('upgradeDamageMultiplierResponse', { success: success })
    })
    
    // Add experience (called when enemy dies, etc.)
    socket.on('addExperience', (exp) => {
        const player = playersInServer.get(socket.user.id)
        if (!player) return
        const result = characterUpgrades.addExperience(player, exp)
        if (result.leveledUp) {
            socket.emit('levelUp', { newLevel: result.newLevel })
        }
        const stats = characterUpgrades.getCharacterStats(player)
        socket.emit('characterStats', stats)
    })
    
    // ========== ACCOUNT UPGRADES HANDLERS (PERSISTENT) ==========
    
    // Get available account upgrades
    socket.on('getAccountUpgrades', async () => {
        const upgrades = await accountUpgrades.getAvailableUpgrades(socket.user.id)
        socket.emit('accountUpgrades', upgrades)
    })
    
    // Purchase permanent upgrade
    socket.on('purchaseAccountUpgrade', async (data) => {
        const { upgradeType, amount } = data
        const success = await accountUpgrades.purchasePermanentUpgrade(socket.user.id, upgradeType, amount)
        socket.emit('purchaseAccountUpgradeResponse', { success: success })
        
        if (success) {
            // Reload upgrades
            const upgrades = await accountUpgrades.getAvailableUpgrades(socket.user.id)
            socket.emit('accountUpgrades', upgrades)
        }
    })
    
    // Unlock weapon
    socket.on('unlockWeapon', async (weaponType) => {
        const success = await accountUpgrades.unlockWeapon(socket.user.id, weaponType)
        socket.emit('unlockWeaponResponse', { success: success, weaponType: weaponType })
        
        if (success) {
            const upgrades = await accountUpgrades.getAvailableUpgrades(socket.user.id)
            socket.emit('accountUpgrades', upgrades)
        }
    })

    socket.on('collectLoot', (lootId) => {
        const roomId = playerToRoom.get(socket)
        if (!roomId) return
        
        const room = dungeonRooms.get(roomId)
        if (!room) return
        
        const lootIndex = room.loot.findIndex(l => l.id === lootId)
        if (lootIndex === -1) return
        
        const loot = room.loot[lootIndex]
        room.loot.splice(lootIndex, 1)
        
        // Give gold to player
        const player = playersInServer.get(socket.user.id)
        if (player) {
            player.gold = (player.gold || 0) + loot.amount
        }
        
        // Notify party
        const party = parties.get(room.partyId)
        if (party) {
            party.members.forEach(member => {
                member.emit('lootCollected', {
                    playerId: socket.user.id,
                    lootId: lootId,
                    amount: loot.amount
                })
            })
        }
    })
})

// Server tick loop for enemy AI and player auto-attacks
setInterval(() => {
    enemyAI.update()
    
    // Auto-attack for all players in rooms
    playersInServer.forEach((player, userId) => {
        const playerSocket = Array.from(io.sockets.sockets.values()).find(s => s.user?.id === userId)
        if (playerSocket) {
            combatSystem.autoAttack(playerSocket)
        }
    })
}, 1000 / SHIP.TICK_RATE) // Run on server tick

// Periodically send stats updates to all players (every 2 seconds)
setInterval(() => {
    playersInServer.forEach((player, userId) => {
        const playerSocket = Array.from(io.sockets.sockets.values()).find(s => s.user?.id === userId)
        if (playerSocket) {
            const charStats = characterUpgrades.getCharacterStats(player)
            const weaponStats = weaponSystem.getWeaponStatsForDisplay(player)
            playerSocket.emit('characterStats', charStats)
            playerSocket.emit('weaponStats', weaponStats)
        }
    })
}, 2000)

// Initialize server
async function initializeServer() {
    try {
        server.listen(SHIP.PORT, '0.0.0.0', () => {
            console.log(`Dungeon Crawler Server running on http://0.0.0.0:${SHIP.PORT}.`)
        })
    } catch (error) {
        console.error('Server failed to start.')
        console.log(error)
        process.exit(1)
    }
}

if (require.main === module && process.env.NODE_ENV !== 'test') {
    initializeServer()
}

module.exports = app

