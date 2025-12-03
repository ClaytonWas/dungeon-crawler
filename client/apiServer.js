const express = require('express')
const session = require('express-session')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const path = require('path')
const jsonWebToken = require('jsonwebtoken')
const fs = require('fs')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3001
const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dungeoncrawler'

const activeSessions = new Map()

// Session cleanup interval
const sessionCleanupInterval = setInterval(() => {
    const now = Math.floor(Date.now() / 1000)
    for (const [userId, sessionInfo] of activeSessions.entries()) {
        try {
            const decoded = jsonWebToken.decode(sessionInfo.token)
            if (!decoded || !decoded.exp || decoded.exp < now) {
                activeSessions.delete(userId)
            }
        } catch (error) {
            activeSessions.delete(userId)
        }
    }
}, 5 * 60 * 1000)

// Database setup
const dbPath = path.join(__dirname, './db/accounts.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

if (!fs.existsSync(dbPath)) {
    console.log('[Profile API] Database not found, initializing...')
    try {
        const sqlPath = path.join(__dirname, './db/accounts.sql')
        if (fs.existsSync(sqlPath)) {
            const accountsDB = new sqlite3.Database(dbPath, (error) => {
                if (error) {
                    console.error('[Profile API] Error creating database:', error)
                } else {
                    const sql = fs.readFileSync(sqlPath, 'utf-8')
                    accountsDB.exec(sql, (error) => {
                        if (error) {
                            console.error('[Profile API] Error initializing schema:', error)
                        } else {
                            console.log('[Profile API] Database initialized successfully')
                        }
                        accountsDB.close()
                    })
                }
            })
        }
    } catch (error) {
        console.error('[Profile API] Error initializing database:', error)
    }
}

const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        return console.error('[Profile API]', error.message)
    }
    console.log('[Profile API] Connected to database')
})

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        sameSite: 'lax', // Allow cookies in same-site navigation
        maxAge: 3 * 60 * 60 * 1000 // 3 hours
    },
    name: 'dungeon.sid' // Custom session cookie name
}))

// API Routes

// Get current user
app.get('/api/me', (req, res) => {
    if (req.session.user) {
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
app.post('/api/login', (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }

    db.get('SELECT * FROM accounts WHERE username = ?', [username], async (error, row) => {
        if (error) {
            console.error('[Profile API] Login error:', error.message)
            return res.status(500).json({ message: 'Database error' })
        }

        if (!row) {
            return res.status(401).json({ message: 'Invalid username or password' })
        }

        try {
            const match = await bcrypt.compare(password, row.password)
            if (!match) {
                return res.status(401).json({ message: 'Invalid username or password' })
            }

            req.session.user = {
                id: row.id,
                username: row.username,
                shape: row.shape || 'cube',
                color: row.color || '#00ff00'
            }

            console.log(`[Profile API] User logged in: ${username}`)
            res.json({
                message: 'Login successful',
                user: req.session.user
            })
        } catch (err) {
            console.error('[Profile API] Password comparison error:', err)
            res.status(500).json({ message: 'Authentication error' })
        }
    })
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

        db.run(
            'INSERT INTO accounts (username, password, shape, color) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, userShape, userColor],
            function (error) {
                if (error) {
                    if (error.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ message: 'Username already exists' })
                    }
                    console.error('[Profile API] Registration error:', error.message)
                    return res.status(500).json({ message: 'Database error' })
                }

                const userId = this.lastID
                req.session.user = {
                    id: userId,
                    username: username,
                    shape: userShape,
                    color: userColor
                }

                console.log(`[Profile API] User registered: ${username}`)
                res.status(201).json({
                    message: 'Registration successful',
                    user: req.session.user
                })
            }
        )
    } catch (err) {
        console.error('[Profile API] Password hashing error:', err)
        res.status(500).json({ message: 'Registration error' })
    }
})

// Logout
app.post('/api/logout', (req, res) => {
    const username = req.session.user?.username
    req.session.destroy((error) => {
        if (error) {
            console.error('[Profile API] Logout error:', error)
            return res.status(500).json({ message: 'Error logging out' })
        }
        if (username) {
            console.log(`[Profile API] User logged out: ${username}`)
        }
        res.json({ message: 'Logout successful' })
    })
})

// Get JWT token for game server
app.get('/api/token', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' })
    }

    const token = jsonWebToken.sign(
        {
            id: req.session.user.id,
            username: req.session.user.username,
            shape: req.session.user.shape,
            color: req.session.user.color
        },
        secretKey,
        { expiresIn: '3h' }
    )

    activeSessions.set(req.session.user.id, {
        token: token,
        sessionId: req.sessionID,
        loginTime: Date.now()
    })

    res.json({ token })
})

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'profile-api' })
})

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`[Profile API] Server running on http://localhost:${port}`)
})

// Cleanup on exit
process.on('SIGTERM', () => {
    clearInterval(sessionCleanupInterval)
    db.close()
})

