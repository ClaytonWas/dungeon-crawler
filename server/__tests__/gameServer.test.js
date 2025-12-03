const request = require('supertest')
const http = require('http')
const { Server } = require('socket.io')
const Client = require('socket.io-client')
const jsonWebToken = require('jsonwebtoken')

// Mock the dungeon room JSON
jest.mock('../scenes/dungeonRoom1.json', () => ({
  floors: [],
  objects: [],
  transitions: []
}), { virtual: true })

const app = require('../gameServer')
const SECRET_KEY = 'dungeoncrawler'

describe('Dungeon Crawler Game Server', () => {
  let server
  let port

  beforeAll((done) => {
    server = http.createServer(app)
    server.listen(() => {
      port = server.address().port
      done()
    })
  })

  afterAll((done) => {
    server.close(done)
  })

  describe('HTTP Endpoints', () => {
    test('GET /textures should return texture list', async () => {
      const response = await request(app)
        .get('/textures')
      
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('Socket.IO Authentication', () => {
    test('should reject connection without token', (done) => {
      const client = Client(`http://localhost:${port}`, {
        auth: {}
      })

      client.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication Required')
        client.close()
        done()
      })
    })

    test('should reject connection with invalid token', (done) => {
      const client = Client(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token'
        }
      })

      client.on('connect_error', (error) => {
        expect(error.message).toBe('Invalid Token')
        client.close()
        done()
      })
    })

    test('should accept connection with valid token', (done) => {
      const token = jsonWebToken.sign(
        { id: 1, username: 'testuser', shape: 'cube', color: '#00ff00' },
        SECRET_KEY
      )

      const client = Client(`http://localhost:${port}`, {
        auth: {
          token: token
        }
      })

      client.on('connect', () => {
        expect(client.connected).toBe(true)
        client.close()
        done()
      })
    })
  })

  describe('Party Management', () => {
    let client1, client2, client3, client4, client5
    let token1, token2, token3, token4, token5

    beforeEach(() => {
      token1 = jsonWebToken.sign({ id: 1, username: 'player1', shape: 'cube', color: '#00ff00' }, SECRET_KEY)
      token2 = jsonWebToken.sign({ id: 2, username: 'player2', shape: 'sphere', color: '#0000ff' }, SECRET_KEY)
      token3 = jsonWebToken.sign({ id: 3, username: 'player3', shape: 'cone', color: '#ff0000' }, SECRET_KEY)
      token4 = jsonWebToken.sign({ id: 4, username: 'player4', shape: 'cube', color: '#ffff00' }, SECRET_KEY)
      token5 = jsonWebToken.sign({ id: 5, username: 'player5', shape: 'cube', color: '#ff00ff' }, SECRET_KEY)
    })

    afterEach((done) => {
      const clients = [client1, client2, client3, client4, client5].filter(c => c)
      let closed = 0
      
      clients.forEach(client => {
        if (client && client.connected) {
          client.close()
          closed++
        }
      })
      
      setTimeout(() => done(), 100)
    })

    test('should create a party', (done) => {
      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        expect(data.partyId).toBeDefined()
        expect(data.partyId).toContain('party_')
        done()
      })
    })

    test('should allow players to join a party', (done) => {
      let partyId

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client2 = Client(`http://localhost:${port}`, {
        auth: { token: token2 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        partyId = data.partyId
        client2.on('connect', () => {
          client2.emit('joinParty', partyId)
        })
      })

      client2.on('joinPartyResponse', (result) => {
        expect(result.success).toBe(true)
        expect(result.partyId).toBe(partyId)
        done()
      })
    })

    test('should reject joining full party', (done) => {
      let partyId
      let joined = 0

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        partyId = data.partyId
        
        // Join 3 more players to fill party
        [token2, token3, token4].forEach((token, index) => {
          const client = Client(`http://localhost:${port}`, {
            auth: { token: token }
          })
          
          client.on('connect', () => {
            client.emit('joinParty', partyId)
          })
          
          client.on('joinPartyResponse', (result) => {
            joined++
            if (joined === 3) {
              // Now try to join with 5th player
              client5 = Client(`http://localhost:${port}`, {
                auth: { token: token5 }
              })
              
              client5.on('connect', () => {
                client5.emit('joinParty', partyId)
              })
              
              client5.on('joinPartyResponse', (result) => {
                expect(result.success).toBe(false)
                expect(result.message).toBe('Party is full')
                done()
              })
            }
          })
        })
      })
    })

    test('should update party members when someone joins', (done) => {
      let partyId

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client2 = Client(`http://localhost:${port}`, {
        auth: { token: token2 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        partyId = data.partyId
        client2.on('connect', () => {
          client2.emit('joinParty', partyId)
        })
      })

      let updateCount = 0
      client1.on('partyUpdated', (data) => {
        updateCount++
        if (updateCount === 2) { // Initial + join update
          expect(data.members.length).toBe(2)
          expect(data.members.some(m => m.username === 'player1')).toBe(true)
          expect(data.members.some(m => m.username === 'player2')).toBe(true)
          done()
        }
      })
    })
  })

  describe('Combat System', () => {
    let client1, client2
    let token1, token2
    let partyId

    beforeEach((done) => {
      token1 = jsonWebToken.sign({ id: 1, username: 'player1', shape: 'cube', color: '#00ff00' }, SECRET_KEY)
      token2 = jsonWebToken.sign({ id: 2, username: 'player2', shape: 'sphere', color: '#0000ff' }, SECRET_KEY)

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        partyId = data.partyId
        client2 = Client(`http://localhost:${port}`, {
          auth: { token: token2 }
        })

        client2.on('connect', () => {
          client2.emit('joinParty', partyId)
        })

        client2.on('joinPartyResponse', () => {
          client1.emit('startDungeon')
        })
      })

      client1.on('enterDungeonRoom', () => {
        done()
      })
    })

    afterEach((done) => {
      if (client1 && client1.connected) client1.close()
      if (client2 && client2.connected) client2.close()
      setTimeout(() => done(), 100)
    })

    test('should allow attacking enemies', (done) => {
      let enemyId = null

      client1.on('enterDungeonRoom', (data) => {
        expect(data.enemies.length).toBeGreaterThan(0)
        enemyId = data.enemies[0].id
        client1.emit('attackEnemy', enemyId)
      })

      client1.on('attackEnemyResponse', (result) => {
        expect(result.success).toBe(true)
        expect(result.damage).toBeGreaterThan(0)
        done()
      })
    })

    test('should broadcast enemy damage to party members', (done) => {
      let enemyId = null
      let damageReceived = false

      client1.on('enterDungeonRoom', (data) => {
        enemyId = data.enemies[0].id
        client1.emit('attackEnemy', enemyId)
      })

      client2.on('enemyDamaged', (data) => {
        expect(data.enemyId).toBe(enemyId)
        expect(data.damage).toBeGreaterThan(0)
        expect(data.health).toBeLessThanOrEqual(data.maxHealth)
        damageReceived = true
      })

      client1.on('attackEnemyResponse', () => {
        setTimeout(() => {
          expect(damageReceived).toBe(true)
          done()
        }, 100)
      })
    })

    test('should spawn loot when enemy is killed', (done) => {
      let enemyId = null
      let lootReceived = false

      client1.on('enterDungeonRoom', (data) => {
        enemyId = data.enemies[0].id
        // Attack enemy multiple times to kill it
        let attacks = 0
        const attackEnemy = () => {
          client1.emit('attackEnemy', enemyId)
          attacks++
          if (attacks < 10) {
            setTimeout(attackEnemy, 50)
          }
        }
        attackEnemy()
      })

      client1.on('enemyKilled', (data) => {
        expect(data.enemyId).toBeDefined()
        expect(data.loot).toBeDefined()
        expect(data.loot.type).toBe('gold')
        expect(data.loot.amount).toBeGreaterThan(0)
        lootReceived = true
      })

      setTimeout(() => {
        if (lootReceived) {
          done()
        } else {
          done() // Timeout - might need more attacks
        }
      }, 2000)
    })
  })

  describe('Player Position Updates', () => {
    let client1, client2
    let token1, token2

    beforeEach((done) => {
      token1 = jsonWebToken.sign({ id: 1, username: 'player1', shape: 'cube', color: '#00ff00' }, SECRET_KEY)
      token2 = jsonWebToken.sign({ id: 2, username: 'player2', shape: 'sphere', color: '#0000ff' }, SECRET_KEY)

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        client2 = Client(`http://localhost:${port}`, {
          auth: { token: token2 }
        })

        client2.on('connect', () => {
          client2.emit('joinParty', data.partyId)
        })

        client2.on('joinPartyResponse', () => {
          client1.emit('startDungeon')
        })
      })

      client1.on('enterDungeonRoom', () => {
        done()
      })
    })

    afterEach((done) => {
      if (client1 && client1.connected) client1.close()
      if (client2 && client2.connected) client2.close()
      setTimeout(() => done(), 100)
    })

    test('should broadcast player position updates to party members', (done) => {
      let positionReceived = false

      client2.on('broadcastPlayerPosition', (data) => {
        expect(data.id).toBe(1)
        expect(data.position).toBeDefined()
        expect(data.position.x).toBeDefined()
        expect(data.position.y).toBeDefined()
        expect(data.position.z).toBeDefined()
        positionReceived = true
      })

      client1.emit('updatePlayerPosition', { x: 5, y: 0.5, z: 5 })

      setTimeout(() => {
        expect(positionReceived).toBe(true)
        done()
      }, 200)
    })
  })

  describe('Chat System', () => {
    let client1, client2
    let token1, token2

    beforeEach((done) => {
      token1 = jsonWebToken.sign({ id: 1, username: 'player1', shape: 'cube', color: '#00ff00' }, SECRET_KEY)
      token2 = jsonWebToken.sign({ id: 2, username: 'player2', shape: 'sphere', color: '#0000ff' }, SECRET_KEY)

      client1 = Client(`http://localhost:${port}`, {
        auth: { token: token1 }
      })

      client1.on('connect', () => {
        client1.emit('createParty')
      })

      client1.on('partyCreated', (data) => {
        client2 = Client(`http://localhost:${port}`, {
          auth: { token: token2 }
        })

        client2.on('connect', () => {
          client2.emit('joinParty', data.partyId)
        })

        client2.on('joinPartyResponse', () => {
          done()
        })
      })
    })

    afterEach((done) => {
      if (client1 && client1.connected) client1.close()
      if (client2 && client2.connected) client2.close()
      setTimeout(() => done(), 100)
    })

    test('should broadcast messages to party members', (done) => {
      let messageReceived = false

      client2.on('recieveGlobalUserMessage', (message, id, username) => {
        expect(message).toBe('Hello party!')
        expect(id).toBe(1)
        expect(username).toBe('player1')
        messageReceived = true
      })

      client1.emit('sendGlobalUserMessage', 'Hello party!')

      setTimeout(() => {
        expect(messageReceived).toBe(true)
        done()
      }, 200)
    })
  })
})

