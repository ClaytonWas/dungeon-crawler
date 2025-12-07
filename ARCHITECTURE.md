# 🏗️ Architecture Overview

This document provides a comprehensive overview of the Dungeon Crawler MMO architecture.

---

## 🌐 LAN & Network Support

The game supports both localhost and LAN play without any configuration changes.

### How It Works

All client-side URLs are determined **dynamically at runtime** using `window.location.hostname`:

```javascript
// Profile server (from game client)
const PROFILE_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3000`

// Game server (Socket.IO connection)
const GAME_SERVER_URL = `${window.location.protocol}//${window.location.hostname}:3030`
```

### Benefits
- **Zero configuration** - Same Docker build works on localhost and LAN
- **Auto-detection** - URLs adapt to however the user accessed the site
- **No rebuild needed** - No environment variables to set for different hosts

### CORS Configuration

The game server allows connections from:
- `localhost` and `127.0.0.1` (ports 3000, 5173)
- Private network IPs: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`

```javascript
// Server automatically allows private IPs on game ports
const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)
const isGamePort = ['3000', '5173', '3030', '3001'].includes(port)
```

### LAN Setup
1. Run `docker-compose up` on host machine
2. Find host's LAN IP (e.g., `192.168.1.100`)
3. LAN players access `http://192.168.1.100:3000`
4. Everything auto-connects to the correct servers

---

## 📊 System Architecture (Updated 2025)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌────────────────────┐         ┌──────────────────────────┐   │
│  │  Profile Client    │         │   Game Client            │   │
│  │  (React + Vite)    │         │   (React + Three.js)     │   │
│  │   Port 3000        │         │      Port 5173           │   │
│  │                    │         │                          │   │
│  │ • Login/Register   │         │  ┌────────────────────┐  │   │
│  │ • Home Dashboard   │         │  │   GameCanvas.jsx  │  │   │
│  │ • Routing (React   │         │  │   (Three.js)      │  │   │
│  │   Router)          │         │  └────────────────────┘  │   │
│  │ • State (Zustand)  │         │  ┌────────────────────┐  │   │
│  │ • Tailwind CSS     │         │  │   RightPanel.jsx  │  │   │
│  └────────┬───────────┘         │  │   (UI Tabs)       │  │   │
│           │                     │  └────────────────────┘  │   │
│           │ /api/* (Proxy)      │  ┌────────────────────┐  │   │
│           │                     │  │   useSocket.js    │  │   │
│           │                     │  │   (Socket.IO)     │  │   │
│           │                     │  └────────────────────┘  │   │
│           │                     └──────────────────────────┘   │
└───────────┼──────────────────────────────┼────────────────────┘
            │                              │
            │ HTTP/REST                    │ Socket.IO WebSocket
            │                              │
┌───────────▼──────────────────────────────▼────────────────────┐
│                         SERVER LAYER                            │
│  ┌───────────────────┐         ┌──────────────────────────┐   │
│  │  Profile API      │         │   Game Server            │   │
│  │  (Express)        │         │   (Socket.IO + Express)  │   │
│  │   Port 3001       │         │      Port 3030           │   │
│  │                   │         │                          │   │
│  │ • RESTful API     │         │  • WebSocket Server      │   │
│  │ • DB Sessions     │         │  • Real-time State       │   │
│  │ • Auth (bcrypt)   │         │  • Combat System         │   │
│  │ • Play Tickets    │         │  • Party Management      │   │
│  │ • SQLite DB       │         │  • Character Manager     │   │
│  │ • Characters API  │         │  • Weapon System         │   │
│  │ • Session Mgmt    │         │  • Kicked User Polling   │   │
│  │ • CORS Config     │         │  • Scene API             │   │
│  └───────────────────┘         │  • Chat System           │   │
│                                └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Authentication Flow

```
User Registration/Login
    ↓
Profile Client (React Form)
    ↓
POST /api/login or /api/register
    ↓
Profile API (Express)
    ↓
bcrypt.compare() / bcrypt.hash()
    ↓
SQLite Database (accounts table)
    ↓
Check for existing sessions
    ↓
┌─────────────────────────────────────┐
│ Active session exists?              │
├─────────────────────────────────────┤
│ YES → Return 409 SESSION_EXISTS     │
│       Show "Force Login" option     │
│ NO  → Create new session in DB      │
└─────────────────────────────────────┘
    ↓
Store session in sessions table
    ↓
Set session cookie (dungeon.sid)
    ↓
Return User Data
    ↓
Profile Client (Update Zustand Store)
    ↓
Redirect to Home Page
```

### 1b. Force Login Flow

```
User clicks "Force Login"
    ↓
POST /api/login { forceLogin: true }
    ↓
Delete all existing sessions for user
    ↓
Mark user as kicked (kickedUsers Map)
    ↓
Game Server polls /api/kicked-users/check
    ↓
Find socket by userId + check timestamp
    ↓
┌─────────────────────────────────────┐
│ Socket connected before kick time?  │
├─────────────────────────────────────┤
│ YES → Emit 'forceDisconnect' event  │
│       Client shows toast + redirects│
│ NO  → Skip (new session is valid)   │
└─────────────────────────────────────┘
```

### 2. Game Entry Flow

```
User clicks "Enter Game"
    ↓
Dynamic URL: window.location.protocol + '//' + window.location.hostname + ':5173'
    ↓
Game Client Loads (React)
    ↓
POST /api/play-ticket (with session cookie)
    ↓
Profile API generates short-lived ticket
    ↓
Game Client receives ticket
    ↓
Socket.IO handshake sends ticket
    ↓
Game Server validates ticket with Profile API
    ↓
Emit 'authenticated' event
    ↓
Load player into hub world
```

### 3. Movement Flow (Client-Side Prediction)

```
Keyboard Input (WASD)
    ↓
GameCanvas.jsx (keysRef tracking)
    ↓
Client-Side Prediction:
  - Update local player position immediately
  - Camera follows instantly (no lerp for local player)
  - Store position in localPlayerPositionRef
    ↓
socket.emit('updatePlayerPosition', { x, z })
    ↓
Game Server (gameServer.js)
    ↓
Update players Map
    ↓
Broadcast to area:
  - hubWorldPlayers.forEach(...)
  - or dungeonRoom.players.forEach(...)
    ↓
socket.emit('playerMoved', { id, position })
    ↓
All Clients in Area:
  - Local player: Server reconciliation (snap if drift > threshold)
  - Other players: Smooth interpolation to target position
    ↓
Update Three.js mesh positions
```

**Key Movement Optimizations:**
- **Client-side prediction** - Local player moves instantly without waiting for server
- **Server reconciliation** - Corrects position if client drifts too far from server state
- **Smooth interpolation** - Other players interpolate smoothly to avoid jitter
- **Rigid camera** - Camera follows local player without lerp for responsive feel
- **Animation frame timing** - Movement processed in requestAnimationFrame, not React renders

### 4. Combat Flow

```
Server Combat Loop (100ms interval)
    ↓
For each player in dungeon:
  ↓
  Check weapon cooldown
  ↓
  Find enemies within attackRadius
  ↓
  Target up to maxTargets enemies
  ↓
  Calculate damage (base + variation) * multiplier
  ↓
  Update enemy health
  ↓
  Broadcast 'playerAttacked' event
    ↓
All Clients in Room
    ↓
Display damage numbers (floating text)
    ↓
Show bounding boxes on targeted enemies
    ↓
Update enemy health/remove if dead
```

### 5. Chat System Flow

```
Player types message in SocialTab
    ↓
Check activeChatTab (global or party)
    ↓
Global Chat:
  socket.emit('sendGlobalUserMessage', { message })
    ↓
  Game Server broadcasts to all hub_world players
    ↓
  io.to('hub_world').emit('receiveGlobalMessage', { username, message })
    ↓
  All hub clients add to globalMessages store

Party Chat:
  socket.emit('sendPartyMessage', { message })
    ↓
  Game Server finds player's party
    ↓
  Broadcast to party members only
    ↓
  partyMembers.forEach → emit('receivePartyMessage', { username, message })
    ↓
  Party clients add to partyMessages store
```

**Chat Features:**
- **Tabbed UI** - Switch between Global and Party channels
- **Global chat** - Visible to all players in hub world
- **Party chat** - Private to party members only
- **Unread indicator** - Badge shows unread party messages
- **Color coding** - Different colors per channel (crimson/gold)

### 5. Scene Loading Flow

```
GameCanvas.jsx loads
    ↓
sceneLoaderRef.loadScene('hub_world')
    ↓
HTTP GET /api/scenes/hub_world
    ↓
Game Server reads server/scenes/hub_world.json
    ↓
Returns JSON
    ↓
SceneLoader.parseScene()
    ↓
GeometryFactory.create() + MaterialFactory.create()
    ↓
Create Three.js objects:
  - Meshes (ground, platforms, walls)
  - Lights (ambient, directional, point, spot)
  - Environment (skybox, fog)
    ↓
Add to Three.js scene
    ↓
Render
```

---

## 📦 Key Components

### Profile Client (React)

#### **Login.jsx**
- Username/password form
- Error handling
- Redirect on success
- Link to registration

#### **Register.jsx**
- Account creation form
- Password confirmation
- Character customization (shape, color)
- Client-side validation

#### **Home.jsx**
- Welcome dashboard
- "Enter Game" button
- Account information display
- Logout functionality
- **Settings Panel** (expandable):
  - Active sessions list with terminate option
  - "Logout All Devices" button  
  - Password change form (current + new password)

#### **authStore.js (Zustand)**
```javascript
{
  user: { id, username, shape, color },
  isAuthenticated: boolean,
  login: (userData) => void,
  logout: () => Promise<void>,
  checkAuth: () => Promise<boolean>
}
```

---

### Profile API Endpoints

#### **Authentication**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Create new account |
| `/api/login` | POST | Login (returns 409 if session exists) |
| `/api/logout` | POST | End current session |
| `/api/me` | GET | Get current user info |

#### **Session Management**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List user's active sessions |
| `/api/sessions/:sessionId` | DELETE | Terminate specific session |
| `/api/logout-all` | POST | Terminate all sessions except current |
| `/api/change-password` | POST | Change password (requires current) |

#### **Characters (Internal - for Game Server)**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/characters/user/:userId` | GET | Get user's characters |
| `/api/characters/:id` | GET | Get character by ID |
| `/api/characters` | POST | Create character |
| `/api/characters/:id` | PUT | Update character |
| `/api/characters/:id` | DELETE | Delete character |

#### **Game Integration**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/play-ticket` | POST | Generate short-lived ticket |
| `/api/play-ticket/validate` | POST | Validate ticket (game server) |
| `/api/kicked-users/check` | POST | Check for kicked users (polling) |

---

### Game Client (React + Three.js)

#### **GameCanvas.jsx**
- **Purpose**: Main 3D rendering component
- **Responsibilities**:
  - Initialize Three.js (scene, camera, renderer)
  - Load worlds via SceneLoader
  - Render player/enemy meshes
  - Handle input (keyboard, mouse, pointer lock)
  - Camera follow system
  - Combat visuals (damage numbers, bounding boxes, attack radius)
  - Sync Socket.IO state to Three.js

#### **useSocket.js**
- Socket.IO connection with play-ticket authentication + auto refresh
- Event listeners for game state
- Updates Zustand store
- Handles disconnections/reconnections

#### **gameStore.js (Zustand)**
```javascript
{
  socket: Socket.IO instance,
  playerId: string,
  players: Map<id, playerData>,
  enemies: Map<id, enemyData>,
  inHubWorld: boolean,
  inDungeon: boolean,
  party: partyData,
  weaponStats: weaponData,
  targetedEnemies: Set<id>,
  damageNumbers: Array
}
```

---

### Profile API (Express)

#### **apiServer.js**
- **Port**: 3001
- **Database**: SQLite (accounts.db)
- **Session**: Database-backed sessions (sessions table)
- **Tables**:

| Table | Description |
|-------|-------------|
| `accounts` | User accounts (username, password, shape, color) |
| `sessions` | Active sessions (user_id, expires_at, ip_address) |
| `characters` | Character data (stats, level, weapon, etc.) |

- **Endpoints**:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/me` | Get current user | ✅ |
| POST | `/api/login` | Login (blocks if session exists) | ❌ |
| POST | `/api/register` | Register | ❌ |
| POST | `/api/logout` | Logout | ✅ |
| GET | `/api/sessions` | List active sessions | ✅ |
| DELETE | `/api/sessions/:id` | Terminate session | ✅ |
| POST | `/api/logout-all` | Logout all devices | ✅ |
| POST | `/api/change-password` | Change password | ✅ |
| POST | `/api/play-ticket` | Issue short-lived game ticket | ✅ |
| POST | `/api/play-ticket/validate` | Validate ticket (game server) | Internal |
| POST | `/api/kicked-users/check` | Check for kicked users | Internal |
| GET | `/api/characters/user/:userId` | Get user's characters | Internal |
| POST | `/api/characters` | Create character | Internal |
| PUT | `/api/characters/:id` | Update character | Internal |
| GET | `/api/health` | Health check | ❌ |

---

### Game Server (Socket.IO + Express)

#### **gameServer.js**
- **Port**: 3030
- **Key Objects**:
  - `players` - Map<socketId, playerData>
  - `hubWorldPlayers` - Set<socketId>
  - `parties` - Map<partyId, partyData>
  - `dungeonRooms` - Map<roomId, roomData>
  - `userSockets` - Map<userId, {socket, connectedAt}> (for force-disconnect)
  - `combatSystem` - Auto-attack loop

- **Background Tasks**:
  - Kicked user polling (every 3 seconds)
  - Character stats broadcast (every 2 seconds)
  - Combat loop (every 100ms in dungeons)

#### **Systems** (Modular)

**weaponSystem.js**
- Initialize weapons
- Upgrade stats (radius, damage, cooldown, pierce)
- Calculate damage with variation
- Find targets within range

**characterManager.js**
- Calls Profile API for character CRUD
- Local caching for performance
- Create characters (max 5 per user)
- Track stats (XP, level, kills, deaths)
- Auto-save on stat changes

**characterUpgrades.js** (In-match)
- Upgrade health
- Upgrade movement speed
- Upgrade mana
- Upgrade damage multiplier
- Upgrade attack speed
- Upgrade defense

**accountUpgrades.js** (Permanent)
- Base stat multipliers
- Unlocked weapons
- Default weapon selection

**SceneLoader.js** (Client-side utility)
- Fetch scenes from server
- Parse JSON scene definitions
- Create Three.js objects
- Cache scenes
- Clear scenes

---

## 🗂️ Data Models

### User (Profile - accounts table)

```javascript
{
  id: number,              // Auto-increment primary key
  username: string,        // Unique username
  password: string,        // bcrypt hash (60+ chars)
  shape: 'cube' | 'sphere' | 'cone',
  color: string,           // Hex color (e.g., '#00ff00')
  created_at: timestamp,
  last_login: timestamp,
  password_changed_at: timestamp
}
```

### Session (sessions table)

```javascript
{
  id: string,              // UUID session ID
  user_id: number,         // Foreign key to accounts
  created_at: timestamp,
  last_activity: timestamp,
  expires_at: timestamp,   // Session expiration (3 hours default)
  ip_address: string,      // Client IP for display
  user_agent: string,      // Browser info for display
  data: string             // JSON session data (optional)
}
```

### Character (characters table - Persistent)

```javascript
{
  id: string,                     // 'userId_timestamp_random'
  user_id: number,                // Foreign key to accounts
  name: string,
  shape: 'cube' | 'sphere' | 'cone',
  color: string,
  is_primary: boolean,
  
  // Progression
  level: number,
  experience: number,
  experience_to_next_level: number,
  
  // Base stats (permanent)
  base_max_health: number,
  base_max_mana: number,
  base_movement_speed: number,
  base_damage_multiplier: number,
  base_defense: number,
  
  // Equipment
  weapon_type: string,
  
  // Metadata
  created_at: timestamp,
  last_played: timestamp,
  total_play_time: number,        // Seconds
  total_kills: number,
  total_deaths: number
}
```

### Player (Game State - In Memory)

```javascript
{
  id: string,                     // Socket ID
  userId: number,                 // User account ID
  characterId: string,            // Active character ID
  username: string,
  position: { x: number, y: number, z: number },
  shape: 'cube' | 'sphere' | 'cone',
  color: number,                  // Hex number (e.g., 0x00ff00)
  health: number,
  maxHealth: number,
  weapon: {
    type: string,
    attackRadius: number,
    attackCooldown: number,       // milliseconds
    baseDamage: number,
    damageVariation: number,
    maxTargets: number,           // Piercing
    attackShape: 'circle' | 'cone'
  },
  lastAttackTime: number,
  upgrades: {
    damageMultiplier: number,
    movementSpeed: number,
    attackSpeed: number,
    defense: number
  },
  inHubWorld: boolean,
  inDungeon: boolean,
  partyId: string | null,
  roomId: string | null
}
```

### Party

```javascript
{
  id: string,                     // 'party_randomId'
  leaderId: string,               // Socket ID of leader
  members: string[],              // Array of socket IDs
  maxMembers: number,             // Default: 4
  inDungeon: boolean,
  roomId: string | null,
  createdAt: number               // Date.now()
}
```

### Dungeon Room

```javascript
{
  id: string,                     // 'room_randomId'
  partyId: string,
  players: string[],              // Socket IDs
  enemies: [
    {
      id: string,
      type: 'goblin' | 'skeleton' | ...,
      health: number,
      maxHealth: number,
      position: { x, y, z }
    }
  ],
  status: 'active' | 'completed',
  createdAt: number
}
```

### Scene (JSON)

```javascript
{
  meta: {
    id: string,
    version: string,
    type: 'hub' | 'dungeon' | 'test',
    name: string,
    description: string
  },
  environment: {
    spawn: { position: [x, y, z] },
    skybox: { type: 'color', color: '0xRRGGBB' },
    ambient: { color: '0xRRGGBB', intensity: number },
    fog: {                        // Optional
      type: 'linear' | 'exp' | 'exp2',
      color: '0xRRGGBB',
      near: number,
      far: number,
      density: number
    }
  },
  lights: [
    {
      id: string,
      type: 'directional' | 'point' | 'spot' | 'hemisphere',
      color: '0xRRGGBB',
      intensity: number,
      position: [x, y, z],
      // ... type-specific properties
    }
  ],
  nodes: [
    {
      id: string,
      type: 'mesh' | 'instance',
      geometry: {
        primitive: 'box' | 'sphere' | 'plane' | 'cylinder' | ...,
        parameters: { ... }
      },
      material: {
        type: 'standard' | 'basic' | 'phong' | ...,
        color: '0xRRGGBB',
        roughness: number,
        metalness: number,
        // ...
      },
      transform: {
        position: [x, y, z],
        rotation: [x, y, z],
        scale: [x, y, z]
      },
      rendering: {
        castShadow: boolean,
        receiveShadow: boolean
      }
    }
  ]
}
```

---

## 🔌 Socket.IO Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `[handshake auth]` | `{ ticket }` | Socket.IO connection includes play ticket |
| `updatePlayerPosition` | `{ x, z }` | Move player |
| `getWeaponStats` | - | Request weapon stats |
| `upgradeWeapon` | `{ upgradeType, amount }` | Upgrade weapon |
| `createParty` | - | Create party |
| `joinParty` | `partyId` | Join party |
| `startDungeon` | - | Start dungeon (leader) |
| `createCharacter` | `{ name, shape, color }` | Create character |
| `selectCharacter` | `characterId` | Switch character |
| `chatMessage` | `{ message, area }` | Send chat |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `authenticated` | `{ playerId, userData }` | Auth success |
| `playerJoined` | `{ id, ...playerData }` | Player joined area |
| `playerLeft` | `{ id }` | Player left area |
| `playerMoved` | `{ id, position }` | Position update |
| `playerUpdated` | `{ id, ...changes }` | Appearance changed |
| `areaPlayers` | `{ players: [] }` | All players in area |
| `weaponStatsUpdate` | `{ ...weaponStats }` | Weapon stats |
| `partyCreated` | `{ partyId }` | Party created |
| `partyUpdated` | `{ party }` | Party changed |
| `startDungeonResponse` | `{ success, roomId }` | Dungeon started |
| `playerAttacked` | `{ playerId, targets, damage }` | Combat event |
| `enemiesUpdate` | `{ enemies: [] }` | Enemy state |
| `characterCreated` | `{ success, character }` | Character created |
| `myCharacters` | `{ characters: [] }` | User's characters |
| `chatMessage` | `{ userId, username, message, area }` | Chat received |

---

## 🎯 Design Principles

### 1. **Server Authority**
- All game logic runs on server
- Clients are "dumb" renderers
- Prevents cheating
- Ensures consistency

### 2. **Real-time Broadcasting**
- State changes broadcast immediately
- MMO-style: all players in area see changes
- No request/response for game state

### 3. **Modular Systems**
- Each system in separate file (`systems/`)
- Pure functions
- Easy to test/modify independently

### 4. **JSON-Driven Content**
- Worlds defined in JSON
- Hot-reloadable (volume mounted)
- No code changes for content
- Schema-validated

### 5. **Separation of Concerns**
- Profile API: Auth only
- Game Server: Game logic only
- Clients: Rendering only
- Clear boundaries

---

## 🚀 Performance

### Current Bottlenecks

1. **Combat Loop** (100ms)
   - Solution: Spatial partitioning

2. **Full State Broadcasting**
   - Solution: Delta compression

3. **Scene Clearing**
   - Solution: Object pooling

### Optimization Roadmap

1. **Spatial Partitioning** - Divide world into chunks
2. **Message Batching** - Combine multiple updates
3. **State Interpolation** - Smooth movement
4. **Entity Component System** - Better performance

---

## 📈 Scalability

### Current: Single Server
- Capacity: ~100-500 concurrent players
- SQLite database
- In-memory game state

### Phase 1: Horizontal Scaling
- Multiple game servers
- Redis for shared state
- PostgreSQL for profiles
- Load balancer
- Capacity: ~5,000-10,000 players

### Phase 2: Sharding
- Geographic sharding
- Instance sharding (hub + dungeons)
- Message queue (RabbitMQ/Kafka)
- Capacity: 50,000+ players

---

## 🔐 Security

### Current Measures
- ✅ Play-ticket authentication
- ✅ bcrypt password hashing (cost 10)
- ✅ httpOnly session cookies
- ✅ Socket.IO middleware validation
- ✅ Server-side game logic
- ✅ CORS configuration

### Future Enhancements
- [ ] Rate limiting
- [ ] Input validation (Zod)
- [ ] Anti-cheat (sanity checks)
- [ ] DDoS protection
- [ ] SQL injection prevention (ORM)
- [ ] HTTPS in production
- [ ] CSRF tokens

---

## 📚 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Profile UI** | React 18 | UI framework |
| | Vite | Build tool (fast!) |
| | Tailwind CSS | Styling |
| | React Router | Client routing |
| | Zustand | State management |
| **Game UI** | React 18 | UI framework |
| | Three.js | 3D rendering |
| | Vite | Build tool |
| | Tailwind CSS | Styling |
| | Zustand | State management |
| **Backend** | Node.js 20 | Server runtime |
| | Express | HTTP server |
| | Socket.IO | WebSocket |
| **Database** | SQLite | Dev database |
| | PostgreSQL | Prod (future) |
| **DevOps** | Docker | Containers |
| | Docker Compose | Orchestration |
| | Nginx | Static files |

---

## 🗺️ Directory Structure

```
dungeon-crawler/
├── client/
│   ├── profile-client/           # React profile UI (NEW)
│   │   ├── src/
│   │   │   ├── pages/            # Login, Register, Home
│   │   │   ├── stores/           # Zustand auth store
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   └── package.json
│   ├── game-client/              # React game UI
│   │   ├── src/
│   │   │   ├── components/       # GameCanvas, RightPanel, tabs
│   │   │   ├── hooks/            # useSocket
│   │   │   ├── stores/           # gameStore
│   │   │   ├── utils/            # SceneLoader, factories
│   │   │   └── App.jsx
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── apiServer.js              # Profile API (NEW)
│   ├── Dockerfile.api            # API Dockerfile (NEW)
│   └── db/                       # SQLite database
├── server/
│   ├── gameServer.js             # Game server
│   ├── systems/                  # Modular game systems
│   │   ├── weaponSystem.js
│   │   ├── weaponDefinitions.js
│   │   ├── characterUpgrades.js
│   │   ├── accountUpgrades.js
│   │   └── characterManager.js
│   ├── scenes/                   # JSON world definitions
│   │   ├── hub_world.json
│   │   └── dungeon_corridor.json
│   └── schemas/
│       └── scene.schema.json
├── docker-compose.yaml
├── README.md
├── ARCHITECTURE.md               # This file
├── CONTRIBUTING.md
├── WORLD_CREATION_GUIDE.md       # How to create worlds
├── WEAPON_GUIDE.md               # How to create weapons
└── CHARACTER_GUIDE.md            # How to manage characters
```

---

## 🎓 For Developers

**New to the project?** Read in this order:
1. `README.md` - Overview & quick start
2. `ARCHITECTURE.md` - This file
3. `CONTRIBUTING.md` - Development workflow
4. Specific guides based on what you're working on

**Want to add**:
- New world? → `WORLD_CREATION_GUIDE.md`
- New weapon? → `WEAPON_GUIDE.md`
- Character features? → `CHARACTER_GUIDE.md`

---

**Last Updated**: December 2025  
**Architecture Version**: 2.0 (React Migration)
