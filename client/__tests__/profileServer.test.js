const request = require('supertest')
const app = require('../profileServer')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')

describe('Profile Server', () => {
  const testDbPath = path.join(__dirname, '../db/test_accounts.db')
  let testDb

  beforeAll(async () => {
    // Create test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    testDb = new sqlite3.Database(testDbPath)
    
    return new Promise((resolve, reject) => {
      testDb.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL CHECK(length(username) <= 12),
          password TEXT NOT NULL CHECK(length(password) <= 12),
          salt TEXT NOT NULL,
          hash TEXT NOT NULL,
          shape TEXT NOT NULL CHECK (shape IN ('cube', 'sphere', 'cone')),
          color TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  afterAll((done) => {
    if (testDb) {
      testDb.close((err) => {
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath)
        }
        done(err)
      })
    } else {
      done()
    }
  })

  describe('GET Routes', () => {
    test('GET / should return index page', async () => {
      const response = await request(app)
        .get('/')
        .expect(200)
      
      expect(response.text).toContain('Dungeon Crawler')
    })

    test('GET /login should return login page', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200)
      
      expect(response.text).toContain('Login')
    })

    test('GET /register should return register page', async () => {
      const response = await request(app)
        .get('/register')
        .expect(200)
      
      expect(response.text).toContain('Create Account')
    })

    test('GET /home should redirect to login if not authenticated', async () => {
      const response = await request(app)
        .get('/home')
        .expect(302)
      
      expect(response.headers.location).toBe('/login')
    })
  })

  describe('POST /register', () => {
    test('should create a new account', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'testpass',
          shape: 'cube',
          color: '#00ff00'
        })
        .expect(201)
      
      expect(response.body.message).toBe('Account Successfully Created.')
    })

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser2',
          password: 'testpass'
          // Missing shape and color
        })
        .expect(400)
      
      expect(response.body.message).toContain('required')
    })

    test('should reject duplicate username', async () => {
      // First registration
      await request(app)
        .post('/register')
        .send({
          username: 'duplicate',
          password: 'testpass',
          shape: 'cube',
          color: '#00ff00'
        })
        .expect(201)

      // Second registration with same username
      const response = await request(app)
        .post('/register')
        .send({
          username: 'duplicate',
          password: 'testpass2',
          shape: 'sphere',
          color: '#0000ff'
        })
        .expect(409)
      
      expect(response.body.message).toBe('Username is already taken.')
    })
  })

  describe('POST /login', () => {
    beforeEach(async () => {
      // Create a test user
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash('testpass', salt)
      
      return new Promise((resolve, reject) => {
        testDb.run(
          'INSERT INTO accounts (username, password, salt, hash, shape, color) VALUES (?, ?, ?, ?, ?, ?)',
          ['logintest', 'testpass', salt, hash, 'cube', '#00ff00'],
          (err) => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
    })

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'logintest',
          password: 'testpass'
        })
        .expect(200)
      
      expect(response.body.token).toBeDefined()
    })

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'logintest',
          password: 'wrongpass'
        })
        .expect(401)
      
      expect(response.body.message).toBe('Invalid password.')
    })

    test('should reject login with non-existent username', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'nonexistent',
          password: 'testpass'
        })
        .expect(401)
      
      expect(response.body.message).toBe('No account with this username exists.')
    })

    test('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'logintest'
          // Missing password
        })
        .expect(400)
      
      expect(response.body.message).toContain('required')
    })
  })

  describe('GET /logout', () => {
    test('should logout and redirect to home', async () => {
      const response = await request(app)
        .get('/logout')
        .expect(302)
      
      expect(response.headers.location).toBe('/')
    })
  })
})

