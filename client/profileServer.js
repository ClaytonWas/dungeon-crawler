const express = require('express')
const session = require('express-session')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const path = require('path')
const jsonWebToken = require('jsonwebtoken')
const ejs = require('ejs')
const fs = require('fs')

const app = express()
const port = process.env.PORT || process.env.CLIENT_PORT || 3000
const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET || 'dungeoncrawler'
const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:3030'

const activeSessions = new Map()

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

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const dbPath = path.join(__dirname, './db/accounts.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

if (!fs.existsSync(dbPath)) {
    console.log('Database not found, initializing...')
    try {
        const sqlPath = path.join(__dirname, './db/accounts.sql')
        if (fs.existsSync(sqlPath)) {
            const accountsDB = new sqlite3.Database(dbPath, (error) => {
                if (error) {
                    console.error('Error creating database:', error)
                } else {
                    const sql = fs.readFileSync(sqlPath, 'utf-8')
                    accountsDB.exec(sql, (error) => {
                        if (error) {
                            console.error('Error initializing schema:', error)
                        } else {
                            console.log('Database initialized successfully')
                        }
                        accountsDB.close()
                    })
                }
            })
        }
    } catch (error) {
        console.error('Error initializing database:', error)
    }
}

const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        return console.error(error.message)
    }
})

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static(path.join(__dirname, './public')))
app.use(session({secret: secretKey, resave: false, saveUninitialized: false}))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'index.html'))
})

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'login.html'))
})

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'register.html'))
})

app.post('/login', (req, res) => {
    const {username, password} = req.body

    if (!username || !password) {
        return res.status(400).json({message: 'Username and password are required to login.'})
    }

    db.get('SELECT * FROM accounts WHERE username = ?', [username], (error, row) => {
        if(error){
            console.error(error.message)
            return res.status(500).json({message: 'The server encountered an error reading the database.'})
        }
        if(row){
            bcrypt.compare(password, row.hash, (error, matches) => {
                if(error){
                    console.error(error)
                    return res.status(500).json({message: 'The server encountered an error authenticating your login.'})
                } else if(matches){
                    const userId = row.id
                    
                    const completeLogin = () => {
                        req.session.user = row
                        const token = jsonWebToken.sign(
                            {id: req.session.user.id, username: req.session.user.username, shape: req.session.user.shape, color: req.session.user.color},
                            secretKey,
                            {expiresIn: '3h'}
                        )
                        
                        activeSessions.set(userId, {
                            token: token,
                            sessionId: req.sessionID,
                            loginTime: Date.now()
                        })
                        
                        return res.status(200).json({token})
                    }
                    
                    if (activeSessions.has(userId)) {
                        const existingSession = activeSessions.get(userId)
                        try {
                            const decoded = jsonWebToken.decode(existingSession.token)
                            if (!decoded || !decoded.exp) {
                                activeSessions.delete(userId)
                                return completeLogin()
                            }
                            const now = Math.floor(Date.now() / 1000)
                            if (decoded.exp < now) {
                                activeSessions.delete(userId)
                                return completeLogin()
                            }
                            return res.status(409).json({
                                message: 'This account is already logged in. Please log out from the other session first.'
                            })
                        } catch (error) {
                            activeSessions.delete(userId)
                            return completeLogin()
                        }
                    } else {
                        return completeLogin()
                    }
                }else{
                    return res.status(401).json({message: 'Invalid password.'})
                }
            })
        }else{
            return res.status(401).json({message: 'No account with this username exists.'})
        }
    })
})

app.post('/register', (req, res) => {
    const {username, password, shape, color} = req.body;

    if (!username || !password || !shape || !color) {
        return res.status(400).json({message: 'All fields are required to create an account.'})
    }

    bcrypt.genSalt(10, (error, salt) => {
        bcrypt.hash(password, salt, (error, hash) => {    
            db.get('SELECT * FROM accounts WHERE username = ?', [username], (error, row) => {
                if (error) {
                    console.error(error.name, error.message)
                    return res.status(500).json({message: 'The server encountered an error reading the database.'})
                }
                if (!row) {
                    db.run('INSERT INTO accounts (username, password, salt, hash, shape, color) VALUES (?, ?, ?, ?, ?, ?)', [username, password, salt, hash, shape, color], (error) => {
                        if (error) {
                            console.error(error.name, error.message)
                            return res.status(500).json({message: 'The server encountered an error registering account details into the database.'})
                        }
                        console.log(`Player Created: ${username}, ${shape}, ${color}`)
                        return res.status(201).json({message: 'Account Successfully Created.'})
                    })
                } else {
                    return res.status(409).json({message: 'Username is already taken.'})
                }
            })
        })
        if (error) {
            console.error(error.name, error.message)
            return res.status(500).json({message: 'Error encrypting the password.'})
        }
    })
})

app.get('/home', (req, res) => {
    if (req.session.user) {
        res.render('home', {username: req.session.user.username});
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

app.get('/logout', (req, res) => {
    if (req.session.user && req.session.user.id) {
        activeSessions.delete(req.session.user.id)
    }
    req.session.destroy((error) => {
        if (error) {
            return res.send('Error logging out')
        }
        res.redirect('/')
    })
})

app.get('/join', (req, res) => {
    if (req.session.user) {
        res.render('world', { gameServerUrl: gameServerUrl })
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

// API endpoint to get token for game client
app.get('/api/token', (req, res) => {
    if (req.session.user) {
        const token = jsonWebToken.sign(
            {id: req.session.user.id, username: req.session.user.username, shape: req.session.user.shape, color: req.session.user.color},
            secretKey,
            {expiresIn: '3h'}
        )
        
        activeSessions.set(req.session.user.id, {
            token: token,
            sessionId: req.sessionID,
            loginTime: Date.now()
        })
        
        return res.json({ token })
    } else {
        return res.status(401).json({ error: 'Not authenticated' })
    }
})

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Dungeon Crawler Client Server running on http://0.0.0.0:${port}`)
    })
}
  
module.exports = app

