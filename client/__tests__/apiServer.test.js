const request = require('supertest')
const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()

// Mock database path to use test database
const testDbPath = path.join(__dirname, '../db/test_accounts.db')

// Set environment variables before importing app
process.env.NODE_ENV = 'test'
process.env.DB_PATH = testDbPath

describe('Profile API Server', () => {
  let app
  let db

  beforeAll((done) => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    // Create test database
    db = new sqlite3.Database(testDbPath)
    
    // Initialize schema
    const sqlPath = path.join(__dirname, '../db/accounts.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    db.exec(sql, (error) => {
      if (error) {
        console.error('Error initializing test database:', error)
        done(error)
      } else {
        // Import app after database is set up
        app = require('../apiServer')
        done()
      }
    })
  })

  afterAll((done) => {
    // Clear session cleanup intervals
    const apiServer = require('../apiServer')
    if (apiServer.sessionCleanupInterval) {
      clearInterval(apiServer.sessionCleanupInterval)
    }
    if (apiServer.sessionDbCleanupInterval) {
      clearInterval(apiServer.sessionDbCleanupInterval)
    }

    // Close both databases
    if (db) {
      db.close()
    }
    if (apiServer.db) {
      apiServer.db.close()
    }

    // Wait a bit for connections to close
    setTimeout(() => {
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        try {
          fs.unlinkSync(testDbPath)
        } catch (err) {
          console.error('Error deleting test database:', err)
        }
      }
      done()
    }, 500)
  })

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser',
          password: 'password123',
          shape: 'cube',
          color: '#ff0000'
        })
        .expect(201)

      expect(response.body).toHaveProperty('message', 'Registration successful')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('username', 'testuser')
      expect(response.body.user).toHaveProperty('shape', 'cube')
      expect(response.body.user).toHaveProperty('color', '#ff0000')
      expect(response.body.user).toHaveProperty('id')
    })

    it('should use default shape and color if not provided', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'defaultuser',
          password: 'password123'
        })
        .expect(201)

      expect(response.body.user.shape).toBe('cube')
      expect(response.body.user.color).toBe('#00ff00')
    })

    it('should reject registration with missing username', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          password: 'password123'
        })
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Username and password are required')
    })

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser2'
        })
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Username and password are required')
    })

    it('should reject registration with password too short', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser3',
          password: '12345' // Only 5 characters
        })
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Password must be at least 6 characters')
    })

    it('should reject duplicate username', async () => {
      // First registration
      await request(app)
        .post('/api/register')
        .send({
          username: 'duplicateuser',
          password: 'password123'
        })
        .expect(201)

      // Second registration with same username
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'duplicateuser',
          password: 'differentpassword'
        })
        .expect(409)

      expect(response.body).toHaveProperty('message', 'Username already exists')
    })

    it('should auto-login user after successful registration', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'autologinuser',
          password: 'password123'
        })
        .expect(201)

      // Check that session is set (we can verify by trying /api/me with the same agent)
      expect(response.headers['set-cookie']).toBeDefined()
    })
  })

  describe('POST /api/login', () => {
    let loginAgent

    beforeAll(async () => {
      // Create a test user for login tests
      loginAgent = request.agent(app)
      await loginAgent
        .post('/api/register')
        .send({
          username: 'logintest',
          password: 'testpass123',
          shape: 'sphere',
          color: '#0000ff'
        })
      // Logout so we can test login
      await loginAgent.post('/api/logout')
    })

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'logintest',
          password: 'testpass123'
        })
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Login successful')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('username', 'logintest')
      expect(response.body.user).toHaveProperty('shape', 'sphere')
      expect(response.body.user).toHaveProperty('color', '#0000ff')
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'logintest',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Invalid username or password')
    })

    it('should reject login with non-existent username', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        })
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Invalid username or password')
    })

    it('should reject login with missing username', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          password: 'password123'
        })
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Username and password are required')
    })

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'logintest'
        })
        .expect(400)

      expect(response.body).toHaveProperty('message', 'Username and password are required')
    })
  })

  describe('GET /api/me', () => {
    let meAgent

    beforeAll(async () => {
      // Create a dedicated user for /api/me tests
      meAgent = request.agent(app)
      await meAgent
        .post('/api/register')
        .send({
          username: 'meuser',
          password: 'testpass123',
          shape: 'sphere',
          color: '#0000ff'
        })
      // Logout so we can test login
      await meAgent.post('/api/logout')
    })

    it('should return user data when authenticated', async () => {
      // Create an agent to persist cookies
      const agent = request.agent(app)

      // Login first
      await agent
        .post('/api/login')
        .send({
          username: 'meuser',
          password: 'testpass123'
        })
        .expect(200)

      // Get user data
      const response = await agent
        .get('/api/me')
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('username', 'meuser')
      expect(response.body).toHaveProperty('shape', 'sphere')
      expect(response.body).toHaveProperty('color', '#0000ff')

      // Logout to clean up session
      await agent.post('/api/logout')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/me')
        .expect(401)

      expect(response.body).toHaveProperty('message', 'Not authenticated')
    })
  })

  describe('POST /api/logout', () => {
    let logoutAgent

    beforeAll(async () => {
      // Create a dedicated user for logout tests
      logoutAgent = request.agent(app)
      await logoutAgent
        .post('/api/register')
        .send({
          username: 'logoutuser',
          password: 'testpass123',
          shape: 'sphere',
          color: '#0000ff'
        })
      // Logout so we can test login
      await logoutAgent.post('/api/logout')
    })

    it('should logout authenticated user', async () => {
      const agent = request.agent(app)

      // Login first
      await agent
        .post('/api/login')
        .send({
          username: 'logoutuser',
          password: 'testpass123'
        })
        .expect(200)

      // Logout
      const response = await agent
        .post('/api/logout')
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Logout successful')

      // Verify user is logged out by trying /api/me
      await agent
        .get('/api/me')
        .expect(401)
    })

    it('should work even when not authenticated', async () => {
      const response = await request(app)
        .post('/api/logout')
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Logout successful')
    })
  })

  describe('Play Ticket Flow', () => {
    let agent

    beforeAll(async () => {
      // Create a dedicated user for play ticket tests
      agent = request.agent(app)
      await agent
        .post('/api/register')
        .send({
          username: 'ticketuser',
          password: 'testpass123',
          shape: 'cube',
          color: '#00ff00'
        })
      // Registration auto-logs in, so we're good
    })

    afterAll(async () => {
      await agent.post('/api/logout')
    })

    it('should issue a play ticket for authenticated user', async () => {
      const response = await agent
        .post('/api/play-ticket')
        .expect(200)

      expect(response.body).toHaveProperty('ticket')
      expect(typeof response.body.ticket).toBe('string')
      expect(response.body.ticket.length).toBeGreaterThan(0)
      expect(response.body).toHaveProperty('expiresIn')
    })

    it('should return 401 when issuing ticket without authentication', async () => {
      await request(app)
        .post('/api/play-ticket')
        .expect(401)
    })

    it('should validate ticket and return user data', async () => {
      const issueResponse = await agent
        .post('/api/play-ticket')
        .expect(200)

      const ticket = issueResponse.body.ticket

      const validation = await request(app)
        .post('/api/play-ticket/validate')
        .send({ ticket })
        .expect(200)

      expect(validation.body).toHaveProperty('valid', true)
      expect(validation.body).toHaveProperty('user')
      expect(validation.body.user).toHaveProperty('username', 'ticketuser')
      expect(validation.body.user).toHaveProperty('shape')
      expect(validation.body.user).toHaveProperty('color')
    })

    it('should reject reused tickets', async () => {
      const issueResponse = await agent.post('/api/play-ticket').expect(200)
      const ticket = issueResponse.body.ticket

      await request(app)
        .post('/api/play-ticket/validate')
        .send({ ticket })
        .expect(200)

      await request(app)
        .post('/api/play-ticket/validate')
        .send({ ticket })
        .expect(401)
    })

    it('should reject invalid tickets', async () => {
      await request(app)
        .post('/api/play-ticket/validate')
        .send({ ticket: 'invalid-ticket' })
        .expect(401)
    })
  })

  describe('GET /api/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
    })
  })

  describe('Session Management', () => {
    it('should maintain session across multiple requests', async () => {
      const agent = request.agent(app)

      // Register
      const registerResponse = await agent
        .post('/api/register')
        .send({
          username: 'sessiontest',
          password: 'password123'
        })
        .expect(201)

      expect(registerResponse.body.user.username).toBe('sessiontest')

      // Should still be logged in - check /api/me
      const meResponse = await agent
        .get('/api/me')
        .expect(200)

      expect(meResponse.body.username).toBe('sessiontest')

      const ticketResponse = await agent
        .post('/api/play-ticket')
        .expect(200)

      expect(ticketResponse.body).toHaveProperty('ticket')

    })

    it('should clear session on logout', async () => {
      // Create a dedicated user for this test
      const agent = request.agent(app)
      await agent
        .post('/api/register')
        .send({
          username: 'clearsessionuser',
          password: 'testpass123',
          shape: 'cube',
          color: '#00ff00'
        })

      // Verify logged in (registration auto-logs in)
      await agent.get('/api/me').expect(200)

      // Logout
      await agent.post('/api/logout').expect(200)

      // Verify logged out
      await agent.get('/api/me').expect(401)
      await agent.post('/api/play-ticket').expect(401)
    })
  })

  describe('Password Security', () => {
    it('should hash passwords in database', (done) => {
      const username = 'securitytest'
      const password = 'mypassword123'

      request(app)
        .post('/api/register')
        .send({
          username: username,
          password: password
        })
        .end(() => {
          // Check database directly
          db.get('SELECT password FROM accounts WHERE username = ?', [username], (error, row) => {
            expect(error).toBeNull()
            expect(row).toBeDefined()
            expect(row.password).not.toBe(password) // Should be hashed
            expect(row.password).toMatch(/^\$2[ayb]\$.{56}$/) // bcrypt hash format
            done()
          })
        })
    })

    it('should verify password correctly with bcrypt', async () => {
      const username = 'bcrypttest'
      const password = 'testpass456'

      // Register with an agent so we can logout
      const agent = request.agent(app)
      await agent
        .post('/api/register')
        .send({
          username: username,
          password: password
        })
        .expect(201)

      // Logout to test login separately
      await agent.post('/api/logout')

      // Login with correct password
      await request(app)
        .post('/api/login')
        .send({
          username: username,
          password: password
        })
        .expect(200)

      // Logout again to test wrong password
      await agent.post('/api/logout')

      // Login with wrong password
      await request(app)
        .post('/api/login')
        .send({
          username: username,
          password: 'wrongpassword'
        })
        .expect(401)
    })
  })
})

