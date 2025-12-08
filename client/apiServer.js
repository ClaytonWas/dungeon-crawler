const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const crypto = require('crypto')

const app = express()
const port = process.env.PORT || 3001
const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dungeoncrawler'

const playTickets = new Map()
const PLAY_TICKET_TTL = 30 * 1000
const SESSION_MAX_AGE = 3 * 60 * 60 * 1000 // 3 hours

// Track users who have been force-logged out (game server polls this)
const kickedUsers = new Map() // userId -> { kickedAt: timestamp, reason: string }
const KICKED_USER_TTL = 60 * 1000 // Keep kicked status for 60 seconds

// Session cleanup interval
const cleanupPlayTickets = () => {
    const now = Date.now()
    for (const [ticket, info] of playTickets.entries()) {
        if (!info || info.expiresAt <= now) {
            playTickets.delete(ticket)
        }
    }
    // Also cleanup old kicked user entries
    for (const [userId, info] of kickedUsers.entries()) {
        if (now - info.kickedAt > KICKED_USER_TTL) {
            kickedUsers.delete(userId)
        }
    }
}

const sessionCleanupInterval = setInterval(() => {
    cleanupPlayTickets()
}, 5 * 60 * 1000)

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, './db/accounts.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

// Initialize database with schema
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        const sqlPath = path.join(__dirname, './db/accounts.sql')
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf-8')
            db.exec(sql, (error) => {
                if (error) {
                    console.error('[Profile API] Error initializing schema:', error)
                    reject(error)
                } else {
                    console.log('[Profile API] Database schema initialized')
                    resolve()
                }
            })
        } else {
            resolve()
        }
    })
}

const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        return console.error('[Profile API]', error.message)
    }
    console.log('[Profile API] Connected to database')
    initializeDatabase().catch(console.error)
})

// Promisified database helpers
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err)
        else resolve({ lastID: this.lastID, changes: this.changes })
    })
})

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row)
    })
})

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows || [])
    })
})

// Session management helpers
const createSession = async (userId, ip, userAgent) => {
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE).toISOString()
    const now = new Date().toISOString()
    
    await dbRun(
        `INSERT INTO sessions (id, user_id, created_at, last_activity, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, now, now, expiresAt, ip, userAgent]
    )
    
    return sessionId
}

const getSession = async (sessionId) => {
    const session = await dbGet(
        `SELECT s.*, a.username, a.shape, a.color 
         FROM sessions s 
         JOIN accounts a ON s.user_id = a.id 
         WHERE s.id = ? AND s.expires_at > datetime('now')`,
        [sessionId]
    )
    return session
}

const updateSessionActivity = async (sessionId) => {
    await dbRun(
        `UPDATE sessions SET last_activity = datetime('now') WHERE id = ?`,
        [sessionId]
    )
}

const deleteSession = async (sessionId) => {
    await dbRun(`DELETE FROM sessions WHERE id = ?`, [sessionId])
}

const deleteUserSessions = async (userId, exceptSessionId = null) => {
    if (exceptSessionId) {
        await dbRun(`DELETE FROM sessions WHERE user_id = ? AND id != ?`, [userId, exceptSessionId])
    } else {
        await dbRun(`DELETE FROM sessions WHERE user_id = ?`, [userId])
    }
    // Mark user as kicked so game server can disconnect them
    kickedUsers.set(userId, { kickedAt: Date.now(), reason: 'force_logout' })
    console.log(`[Profile API] Marked user ${userId} (type: ${typeof userId}) as kicked`)
}

const getUserActiveSessions = async (userId) => {
    return await dbAll(
        `SELECT id, created_at, last_activity, expires_at, ip_address, user_agent 
         FROM sessions 
         WHERE user_id = ? AND expires_at > datetime('now')
         ORDER BY last_activity DESC`,
        [userId]
    )
}

const cleanupExpiredSessions = async () => {
    await dbRun(`DELETE FROM sessions WHERE expires_at <= datetime('now')`)
}

// Cleanup expired sessions periodically
const sessionDbCleanupInterval = setInterval(() => {
    cleanupExpiredSessions().catch(console.error)
}, 15 * 60 * 1000) // Every 15 minutes

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Cookie-based session middleware (database-backed)
const SESSION_COOKIE_NAME = 'dungeon.sid'

const sessionMiddleware = async (req, res, next) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME]
    
    if (sessionId) {
        try {
            const session = await getSession(sessionId)
            if (session) {
                req.session = {
                    id: sessionId,
                    user: {
                        id: session.user_id,
                        username: session.username,
                        shape: session.shape,
                        color: session.color
                    }
                }
                // Update last activity
                updateSessionActivity(sessionId).catch(console.error)
            }
        } catch (err) {
            console.error('[Profile API] Session lookup error:', err)
        }
    }
    
    next()
}

// Cookie parser middleware
app.use((req, res, next) => {
    const cookieHeader = req.headers.cookie
    req.cookies = {}
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.trim().split('=')
            req.cookies[name] = rest.join('=')
        })
    }
    next()
})

app.use(sessionMiddleware)

// Helper to set session cookie
const setSessionCookie = (res, sessionId) => {
    res.setHeader('Set-Cookie', 
        `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE / 1000}`
    )
}

const clearSessionCookie = (res) => {
    res.setHeader('Set-Cookie', 
        `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    )
}

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Not authenticated' })
    }
    next()
}

// API Routes

// Get current user
app.get('/api/me', (req, res) => {
    if (req.session?.user) {
        res.json({
            id: req.session.user.id,
            username: req.session.user.username,
            shape: req.session.user.shape,
            color: req.session.user.color
        })
    } else {
        res.status(401).json({ message: 'Not authenticated' })
    }
})

// Login
app.post('/api/login', async (req, res) => {
    const { username, password, forceLogin } = req.body

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }

    try {
        const row = await dbGet('SELECT * FROM accounts WHERE username = ?', [username])

        if (!row) {
            return res.status(401).json({ message: 'Invalid username or password' })
        }

        const match = await bcrypt.compare(password, row.password)
        if (!match) {
            return res.status(401).json({ message: 'Invalid username or password' })
        }

        // Check for existing active sessions
        const activeSessions = await getUserActiveSessions(row.id)
        
        if (activeSessions.length > 0 && !forceLogin) {
            return res.status(409).json({ 
                message: 'Account already has an active session',
                code: 'SESSION_EXISTS',
                activeSessions: activeSessions.length
            })
        }

        // Force logout other sessions if requested
        if (forceLogin && activeSessions.length > 0) {
            await deleteUserSessions(row.id)
            console.log(`[Profile API] Force logout: cleared ${activeSessions.length} sessions for ${username}`)
        }

        // Create new session
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
        const userAgent = req.headers['user-agent'] || 'unknown'
        const sessionId = await createSession(row.id, ip, userAgent)
        
        // Update last login
        await dbRun('UPDATE accounts SET last_login = datetime(\'now\') WHERE id = ?', [row.id])

        setSessionCookie(res, sessionId)

        console.log(`[Profile API] User logged in: ${username}`)
        res.json({
            message: 'Login successful',
            user: {
                id: row.id,
                username: row.username,
                shape: row.shape || 'cube',
                color: row.color || '#00ff00'
            }
        })
    } catch (err) {
        console.error('[Profile API] Login error:', err)
        res.status(500).json({ message: 'Authentication error' })
    }
})

// Register
app.post('/api/register', async (req, res) => {
    const { username, password, shape, color } = req.body

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }

    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const userShape = shape || 'cube'
        const userColor = color || '#00ff00'

        const result = await dbRun(
            'INSERT INTO accounts (username, password, shape, color) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, userShape, userColor]
        )

        const userId = result.lastID
        
        // Create session for new user
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
        const userAgent = req.headers['user-agent'] || 'unknown'
        const sessionId = await createSession(userId, ip, userAgent)
        
        // Create default character
        const characterId = `${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        await dbRun(
            `INSERT INTO characters (id, user_id, name, shape, color, is_primary) VALUES (?, ?, ?, ?, ?, 1)`,
            [characterId, userId, 'My Character', userShape, userColor]
        )

        setSessionCookie(res, sessionId)

        console.log(`[Profile API] User registered: ${username}`)
        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: userId,
                username: username,
                shape: userShape,
                color: userColor
            }
        })
    } catch (err) {
        if (err.message?.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Username already exists' })
        }
        console.error('[Profile API] Registration error:', err)
        res.status(500).json({ message: 'Registration error' })
    }
})

// Logout
app.post('/api/logout', async (req, res) => {
    const username = req.session?.user?.username
    const sessionId = req.session?.id
    
    if (sessionId) {
        try {
            await deleteSession(sessionId)
        } catch (err) {
            console.error('[Profile API] Session delete error:', err)
        }
    }
    
    clearSessionCookie(res)
    
    if (username) {
        console.log(`[Profile API] User logged out: ${username}`)
    }
    res.json({ message: 'Logout successful' })
})

// Logout all devices
app.post('/api/logout-all', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id
        const currentSessionId = req.session.id
        const { keepCurrent } = req.body
        
        if (keepCurrent) {
            await deleteUserSessions(userId, currentSessionId)
        } else {
            await deleteUserSessions(userId)
            clearSessionCookie(res)
        }
        
        console.log(`[Profile API] Logged out all sessions for user: ${req.session.user.username}`)
        res.json({ message: 'All sessions logged out' })
    } catch (err) {
        console.error('[Profile API] Logout all error:', err)
        res.status(500).json({ message: 'Error logging out sessions' })
    }
})

// Get active sessions
app.get('/api/sessions', requireAuth, async (req, res) => {
    try {
        const sessions = await getUserActiveSessions(req.session.user.id)
        const currentSessionId = req.session.id
        
        res.json({
            sessions: sessions.map(s => ({
                id: s.id,
                isCurrent: s.id === currentSessionId,
                createdAt: s.created_at,
                lastActivity: s.last_activity,
                expiresAt: s.expires_at,
                ipAddress: s.ip_address,
                userAgent: s.user_agent
            }))
        })
    } catch (err) {
        console.error('[Profile API] Get sessions error:', err)
        res.status(500).json({ message: 'Error fetching sessions' })
    }
})

// Delete specific session
app.delete('/api/sessions/:sessionId', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params
        
        // Verify session belongs to user
        const session = await dbGet(
            'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
            [sessionId, req.session.user.id]
        )
        
        if (!session) {
            return res.status(404).json({ message: 'Session not found' })
        }
        
        await deleteSession(sessionId)
        
        // If deleting current session, clear cookie
        if (sessionId === req.session.id) {
            clearSessionCookie(res)
        }
        
        res.json({ message: 'Session terminated' })
    } catch (err) {
        console.error('[Profile API] Delete session error:', err)
        res.status(500).json({ message: 'Error deleting session' })
    }
})

// Change password
app.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' })
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' })
    }
    
    try {
        const user = await dbGet('SELECT * FROM accounts WHERE id = ?', [req.session.user.id])
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        
        const match = await bcrypt.compare(currentPassword, user.password)
        if (!match) {
            return res.status(401).json({ message: 'Current password is incorrect' })
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await dbRun(
            'UPDATE accounts SET password = ?, password_changed_at = datetime(\'now\') WHERE id = ?',
            [hashedPassword, req.session.user.id]
        )
        
        // Optionally logout all other sessions after password change
        await deleteUserSessions(req.session.user.id, req.session.id)
        
        console.log(`[Profile API] Password changed for user: ${req.session.user.username}`)
        res.json({ message: 'Password changed successfully' })
    } catch (err) {
        console.error('[Profile API] Change password error:', err)
        res.status(500).json({ message: 'Error changing password' })
    }
})

// Issue a short-lived play ticket for the game server
app.post('/api/play-ticket', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    const ticket = crypto.randomUUID()
    playTickets.set(ticket, {
        user: {
            id: req.session.user.id,
            username: req.session.user.username,
            shape: req.session.user.shape,
            color: req.session.user.color
        },
        expiresAt: Date.now() + PLAY_TICKET_TTL
    })

    res.json({ ticket, expiresIn: PLAY_TICKET_TTL })
})

// Validate play ticket (used by game server)
app.post('/api/play-ticket/validate', (req, res) => {
    const { ticket } = req.body || {}
    if (!ticket) {
        return res.status(400).json({ message: 'Ticket required' })
    }

    const record = playTickets.get(ticket)
    if (!record) {
        return res.status(401).json({ message: 'Invalid ticket' })
    }

    if (record.expiresAt <= Date.now()) {
        playTickets.delete(ticket)
        return res.status(401).json({ message: 'Ticket expired' })
    }

    playTickets.delete(ticket)
    res.json({ valid: true, user: record.user })
})

// Check for kicked users (game server polls this)
app.post('/api/kicked-users/check', (req, res) => {
    const { userIds } = req.body || {}
    
    if (!Array.isArray(userIds)) {
        return res.status(400).json({ message: 'userIds array required' })
    }
    
    // Debug logging
    if (kickedUsers.size > 0) {
        console.log('[Profile API] Kicked users check - userIds:', userIds, 'kicked map:', Array.from(kickedUsers.keys()))
    }
    
    const kicked = []
    for (const userId of userIds) {
        // Check both number and string versions to handle type mismatches
        const kickInfo = kickedUsers.get(userId) || kickedUsers.get(Number(userId)) || kickedUsers.get(String(userId))
        if (kickInfo) {
            kicked.push({ userId, reason: kickInfo.reason, kickedAt: kickInfo.kickedAt })
            // Remove from kicked list once acknowledged
            kickedUsers.delete(userId)
            kickedUsers.delete(Number(userId))
            kickedUsers.delete(String(userId))
            console.log('[Profile API] Found kicked user:', userId, 'kickedAt:', kickInfo.kickedAt)
        }
    }
    
    res.json({ kicked })
})

// Check if specific user is kicked
app.get('/api/kicked-users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId)
    const kickInfo = kickedUsers.get(userId)
    
    if (kickInfo) {
        kickedUsers.delete(userId)
        res.json({ kicked: true, reason: kickInfo.reason })
    } else {
        res.json({ kicked: false })
    }
})

// ==================== CHARACTER ENDPOINTS ====================

// Helper function to format character response
const formatCharacter = (c) => ({
    id: c.id,
    userId: c.user_id,
    name: c.name,
    shape: c.shape,
    color: c.color,
    isPrimary: c.is_primary === 1,
    level: c.level,
    experience: c.experience,
    experienceToNextLevel: c.experience_to_next_level,
    baseMaxHealth: c.base_max_health,
    baseMaxMana: c.base_max_mana,
    baseMovementSpeed: c.base_movement_speed,
    baseDamageMultiplier: c.base_damage_multiplier,
    baseDefense: c.base_defense,
    weaponType: c.weapon_type,
    createdAt: c.created_at,
    lastPlayed: c.last_played,
    totalPlayTime: c.total_play_time,
    totalKills: c.total_kills,
    totalDeaths: c.total_deaths
})

// ===== INTERNAL ENDPOINTS (for game server - no session required) =====

// Get all characters for a specific user (internal)
app.get('/api/characters/user/:userId', async (req, res) => {
    try {
        const characters = await dbAll(
            `SELECT * FROM characters WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC`,
            [req.params.userId]
        )
        
        if (characters.length === 0) {
            return res.status(404).json({ message: 'No characters found' })
        }
        
        res.json({ characters: characters.map(formatCharacter) })
    } catch (err) {
        console.error('[Profile API] Get user characters error:', err)
        res.status(500).json({ message: 'Error fetching characters' })
    }
})

// Get primary character for a specific user (internal)
app.get('/api/characters/user/:userId/primary', async (req, res) => {
    try {
        let character = await dbGet(
            `SELECT * FROM characters WHERE user_id = ? AND is_primary = 1`,
            [req.params.userId]
        )
        
        if (!character) {
            character = await dbGet(
                `SELECT * FROM characters WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
                [req.params.userId]
            )
        }
        
        if (!character) {
            return res.status(404).json({ message: 'No characters found' })
        }
        
        res.json({ character: formatCharacter(character) })
    } catch (err) {
        console.error('[Profile API] Get primary character error:', err)
        res.status(500).json({ message: 'Error fetching character' })
    }
})

// Create character for a specific user (internal)
app.post('/api/characters/user/:userId', async (req, res) => {
    const { name, shape, color } = req.body
    const userId = parseInt(req.params.userId)
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Character name is required' })
    }
    
    try {
        // Check character limit
        const count = await dbGet(
            `SELECT COUNT(*) as count FROM characters WHERE user_id = ?`,
            [userId]
        )
        
        if (count.count >= 5) {
            return res.status(400).json({ message: 'Maximum character limit reached (5 characters)' })
        }
        
        const characterId = `${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        const charShape = shape || 'cube'
        const charColor = color || '#00ff00'
        
        await dbRun(
            `INSERT INTO characters (id, user_id, name, shape, color) VALUES (?, ?, ?, ?, ?)`,
            [characterId, userId, name.trim(), charShape, charColor]
        )
        
        const character = await dbGet(`SELECT * FROM characters WHERE id = ?`, [characterId])
        
        console.log(`[Profile API] Character created via internal API: ${name} for user ${userId}`)
        res.status(201).json({ message: 'Character created', character: formatCharacter(character) })
    } catch (err) {
        console.error('[Profile API] Create character error:', err)
        res.status(500).json({ message: 'Error creating character' })
    }
})

// Delete character for a specific user (internal)
app.delete('/api/characters/:characterId/user/:userId', async (req, res) => {
    try {
        const character = await dbGet(
            `SELECT * FROM characters WHERE id = ? AND user_id = ?`,
            [req.params.characterId, req.params.userId]
        )
        
        if (!character) {
            return res.status(404).json({ message: 'Character not found' })
        }
        
        const count = await dbGet(
            `SELECT COUNT(*) as count FROM characters WHERE user_id = ?`,
            [req.params.userId]
        )
        
        if (count.count <= 1) {
            return res.status(400).json({ message: 'Cannot delete last character' })
        }
        
        await dbRun(`DELETE FROM characters WHERE id = ?`, [req.params.characterId])
        
        // If deleted primary, make first remaining character primary
        if (character.is_primary === 1) {
            const first = await dbGet(
                `SELECT id FROM characters WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
                [req.params.userId]
            )
            if (first) {
                await dbRun(`UPDATE characters SET is_primary = 1 WHERE id = ?`, [first.id])
            }
        }
        
        console.log(`[Profile API] Character deleted via internal API: ${character.name}`)
        res.json({ message: 'Character deleted' })
    } catch (err) {
        console.error('[Profile API] Delete character error:', err)
        res.status(500).json({ message: 'Error deleting character' })
    }
})

// ===== SESSION-PROTECTED ENDPOINTS =====

// Get all characters for current user
app.get('/api/characters', requireAuth, async (req, res) => {
    try {
        const characters = await dbAll(
            `SELECT * FROM characters WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC`,
            [req.session.user.id]
        )
        
        res.json({ characters: characters.map(formatCharacter) })
    } catch (err) {
        console.error('[Profile API] Get characters error:', err)
        res.status(500).json({ message: 'Error fetching characters' })
    }
})

// Get primary character
app.get('/api/characters/primary', requireAuth, async (req, res) => {
    try {
        let character = await dbGet(
            `SELECT * FROM characters WHERE user_id = ? AND is_primary = 1`,
            [req.session.user.id]
        )
        
        // If no primary, get first character
        if (!character) {
            character = await dbGet(
                `SELECT * FROM characters WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
                [req.session.user.id]
            )
        }
        
        if (!character) {
            return res.status(404).json({ message: 'No characters found' })
        }
        
        res.json({ character: formatCharacter(character) })
    } catch (err) {
        console.error('[Profile API] Get primary character error:', err)
        res.status(500).json({ message: 'Error fetching character' })
    }
})

// Get specific character (public - no auth, for game server)
app.get('/api/characters/:characterId', async (req, res) => {
    try {
        const character = await dbGet(
            `SELECT * FROM characters WHERE id = ?`,
            [req.params.characterId]
        )
        
        if (!character) {
            return res.status(404).json({ message: 'Character not found' })
        }
        
        res.json({ character: formatCharacter(character) })
    } catch (err) {
        console.error('[Profile API] Get character error:', err)
        res.status(500).json({ message: 'Error fetching character' })
    }
})

// Create new character
app.post('/api/characters', requireAuth, async (req, res) => {
    const { name, shape, color } = req.body
    
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Character name is required' })
    }
    
    if (name.length > 20) {
        return res.status(400).json({ message: 'Character name must be 20 characters or less' })
    }
    
    const validShapes = ['cube', 'sphere', 'cone']
    if (shape && !validShapes.includes(shape)) {
        return res.status(400).json({ message: 'Invalid shape' })
    }
    
    try {
        // Check character limit (5 max)
        const count = await dbGet(
            `SELECT COUNT(*) as count FROM characters WHERE user_id = ?`,
            [req.session.user.id]
        )
        
        if (count.count >= 5) {
            return res.status(400).json({ message: 'Maximum character limit reached (5 characters)' })
        }
        
        const characterId = `${req.session.user.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        const charShape = shape || req.session.user.shape || 'cube'
        const charColor = color || req.session.user.color || '#00ff00'
        
        await dbRun(
            `INSERT INTO characters (id, user_id, name, shape, color) VALUES (?, ?, ?, ?, ?)`,
            [characterId, req.session.user.id, name.trim(), charShape, charColor]
        )
        
        const character = await dbGet(`SELECT * FROM characters WHERE id = ?`, [characterId])
        
        console.log(`[Profile API] Character created: ${name} for user ${req.session.user.username}`)
        res.status(201).json({ message: 'Character created', character: formatCharacter(character) })
    } catch (err) {
        console.error('[Profile API] Create character error:', err)
        res.status(500).json({ message: 'Error creating character' })
    }
})

// Update character (name, shape, color, set as primary) - public for game server
app.put('/api/characters/:characterId', async (req, res) => {
    const { name, shape, color, isPrimary } = req.body
    
    try {
        const character = await dbGet(
            `SELECT * FROM characters WHERE id = ?`,
            [req.params.characterId]
        )
        
        if (!character) {
            return res.status(404).json({ message: 'Character not found' })
        }
        
        const updates = []
        const params = []
        
        if (name !== undefined) {
            if (name.trim().length === 0) {
                return res.status(400).json({ message: 'Character name is required' })
            }
            if (name.length > 20) {
                return res.status(400).json({ message: 'Character name must be 20 characters or less' })
            }
            updates.push('name = ?')
            params.push(name.trim())
        }
        
        if (shape !== undefined) {
            const validShapes = ['cube', 'sphere', 'cone']
            if (!validShapes.includes(shape)) {
                return res.status(400).json({ message: 'Invalid shape' })
            }
            updates.push('shape = ?')
            params.push(shape)
        }
        
        if (color !== undefined) {
            updates.push('color = ?')
            params.push(color)
        }
        
        if (isPrimary === true) {
            // Remove primary from all other characters for this user
            await dbRun(
                `UPDATE characters SET is_primary = 0 WHERE user_id = ?`,
                [character.user_id]
            )
            updates.push('is_primary = 1')
        }
        
        if (updates.length > 0) {
            params.push(req.params.characterId)
            await dbRun(
                `UPDATE characters SET ${updates.join(', ')} WHERE id = ?`,
                params
            )
        }
        
        const updated = await dbGet(`SELECT * FROM characters WHERE id = ?`, [req.params.characterId])
        
        res.json({ message: 'Character updated', character: formatCharacter(updated) })
    } catch (err) {
        console.error('[Profile API] Update character error:', err)
        res.status(500).json({ message: 'Error updating character' })
    }
})

// Update character stats (for game server - internal use)
app.patch('/api/characters/:characterId/stats', async (req, res) => {
    // This endpoint is for game server to update stats - no session required but could add API key
    const { experience, kills, deaths, playTime, weaponType, level } = req.body
    
    try {
        const character = await dbGet(
            `SELECT * FROM characters WHERE id = ?`,
            [req.params.characterId]
        )
        
        if (!character) {
            return res.status(404).json({ message: 'Character not found' })
        }
        
        const updates = ['last_played = datetime(\'now\')']
        const params = []
        
        if (experience !== undefined) {
            // Calculate level ups
            let newExp = character.experience + experience
            let newLevel = character.level
            let expToNext = character.experience_to_next_level
            let newMaxHealth = character.base_max_health
            let newMaxMana = character.base_max_mana
            let newDefense = character.base_defense
            
            while (newExp >= expToNext) {
                newExp -= expToNext
                newLevel++
                newMaxHealth += 10
                newMaxMana += 5
                newDefense += 1
                expToNext = Math.floor(100 * Math.pow(1.2, newLevel - 1))
            }
            
            updates.push('experience = ?', 'level = ?', 'experience_to_next_level = ?')
            updates.push('base_max_health = ?', 'base_max_mana = ?', 'base_defense = ?')
            params.push(newExp, newLevel, expToNext, newMaxHealth, newMaxMana, newDefense)
        }
        
        if (kills !== undefined) {
            updates.push('total_kills = total_kills + ?')
            params.push(kills)
        }
        
        if (deaths !== undefined) {
            updates.push('total_deaths = total_deaths + ?')
            params.push(deaths)
        }
        
        if (playTime !== undefined) {
            updates.push('total_play_time = total_play_time + ?')
            params.push(playTime)
        }
        
        if (weaponType !== undefined) {
            updates.push('weapon_type = ?')
            params.push(weaponType)
        }
        
        params.push(req.params.characterId)
        await dbRun(
            `UPDATE characters SET ${updates.join(', ')} WHERE id = ?`,
            params
        )
        
        const updated = await dbGet(`SELECT * FROM characters WHERE id = ?`, [req.params.characterId])
        
        res.json({
            character: {
                id: updated.id,
                level: updated.level,
                experience: updated.experience,
                experienceToNextLevel: updated.experience_to_next_level,
                baseMaxHealth: updated.base_max_health,
                baseMaxMana: updated.base_max_mana,
                baseDefense: updated.base_defense,
                totalKills: updated.total_kills,
                totalDeaths: updated.total_deaths,
                totalPlayTime: updated.total_play_time
            }
        })
    } catch (err) {
        console.error('[Profile API] Update character stats error:', err)
        res.status(500).json({ message: 'Error updating character stats' })
    }
})

// Delete character
app.delete('/api/characters/:characterId', requireAuth, async (req, res) => {
    try {
        // Check character exists and belongs to user
        const character = await dbGet(
            `SELECT * FROM characters WHERE id = ? AND user_id = ?`,
            [req.params.characterId, req.session.user.id]
        )
        
        if (!character) {
            return res.status(404).json({ message: 'Character not found' })
        }
        
        // Check not deleting last character
        const count = await dbGet(
            `SELECT COUNT(*) as count FROM characters WHERE user_id = ?`,
            [req.session.user.id]
        )
        
        if (count.count <= 1) {
            return res.status(400).json({ message: 'Cannot delete last character' })
        }
        
        await dbRun(`DELETE FROM characters WHERE id = ?`, [req.params.characterId])
        
        // If deleted primary, make first remaining character primary
        if (character.is_primary === 1) {
            await dbRun(
                `UPDATE characters SET is_primary = 1 WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`,
                [req.session.user.id]
            )
        }
        
        console.log(`[Profile API] Character deleted: ${character.name} for user ${req.session.user.username}`)
        res.json({ message: 'Character deleted' })
    } catch (err) {
        console.error('[Profile API] Delete character error:', err)
        res.status(500).json({ message: 'Error deleting character' })
    }
})

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'profile-api' })
})

// Start server (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
        console.log(`[Profile API] Server running on http://localhost:${port}`)
    })
}

// Cleanup on exit
const gracefulShutdown = async (signal) => {
    console.log(`[Profile API] Received ${signal}, cleaning up...`)
    clearInterval(sessionCleanupInterval)
    clearInterval(sessionDbCleanupInterval)
    
    // Clear all sessions on shutdown so users don't see "active session" on restart
    try {
        await dbRun(`DELETE FROM sessions`)
        console.log('[Profile API] Cleared all sessions on shutdown')
    } catch (err) {
        console.error('[Profile API] Error clearing sessions:', err)
    }
    
    db.close()
    process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Export for testing
module.exports = app
module.exports.sessionCleanupInterval = sessionCleanupInterval
module.exports.sessionDbCleanupInterval = sessionDbCleanupInterval
module.exports.db = db

