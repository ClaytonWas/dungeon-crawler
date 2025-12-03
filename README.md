# 🎮 Dungeon Crawler MMO

A real-time multiplayer dungeon crawler with **Vampire Survivors-style combat**, built with Node.js, Socket.IO, Three.js, and React.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [System Documentation](#system-documentation)
- [Adding New Features](#adding-new-features)
- [Development Roadmap](#development-roadmap)
- [Contributing](#contributing)


## ✨ Features

### Core Gameplay
- ⚔️ **Vampire Survivors Combat** - Auto-targeting, radius-based attacks, piercing, upgrades
- 🌍 **Persistent Hub World** - Social hub where all players gather
- 🏰 **Instanced Dungeons** - Party-based dungeon runs
- 👥 **Party System** - Create/join parties, party chat
- 💬 **Real-time Chat** - Hub chat and party chat with floating speech bubbles
- 🎭 **Multiple Characters** - Create up to 5 characters per account

### Progression Systems
- 📈 **Character Leveling** - Persistent XP, levels, kills, deaths
- ⚡ **In-Match Upgrades** - Temporary buffs that reset after dungeon
- 🔓 **Account Upgrades** - Permanent unlocks and stat boosts
- 🗡️ **Weapon System** - Multiple weapon types with upgrade paths
- 💎 **Loot Drops** - Enemy drops (foundation ready for item system)

### Technical Features
- 🔄 **Real-time State Sync** - MMO-style concurrent state updates
- 🎨 **Modern UI** - React + Tailwind CSS with dark gothic aesthetic
- 🎮 **3D Graphics** - Three.js rendering with camera controls
- 🔐 **Play Ticket Authentication** - Session-backed, short-lived tickets validated server-to-server
- 🐳 **Docker Deployment** - Multi-service containerized architecture
- 📊 **Performance Monitoring** - FPS counter, connection status


## 🏗️ Architecture

### Services Overview


```
┌───────────────────────────────────────────────────────────────────┐
│                        Docker Compose                             │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│ Profile     │ Profile     │ Game Server │ Game Client             │
│ Client      │ API         │             │ (React/Three.js)        │
│ (React)     │ (Express)   │ (Socket.IO) │                         │
│             │             │             │                         │
│ Port: 3000  │ Port: 3001  │ Port: 3030  │ Port: 5173              │
│ ─────────   │ ─────────   │ ─────────   │ ─────────               │
│ • Login UI  │ • Auth API  │ • Gameplay  │ • Three.js Rendering    │
│ • Register  │ • Sessions  │ • Combat    │ • Game UI/Tabs          │
│ • Dashboard │ • SQLite    │ • Parties   │ • Socket.IO Client      │
│ • Routing   │ • Play Ticket Auth│ • Chat│ • Camera Controls       │
└─────────────┴─────────────┴─────────────┴─────────────────────────┘
```

### Directory Structure

```
dungeon-crawler/
├── client/
│   ├── profile-client/             # React Profile UI (NEW)
│   │   ├── src/
│   │   │   ├── pages/              # Login, Register, Home
│   │   │   ├── stores/             # Auth state (Zustand)
│   │   │   └── App.jsx
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── game-client/                # React Game Client
│   │   ├── src/
│   │   │   ├── components/         # GameCanvas, RightPanel, tabs
│   │   │   ├── hooks/              # useSocket
│   │   │   ├── stores/             # gameStore (Zustand)
│   │   │   ├── utils/              # SceneLoader, factories
│   │   │   └── App.jsx
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── apiServer.js                # Profile API (NEW)
│   ├── Dockerfile.api              # API Dockerfile (NEW)
│   └── db/                         # SQLite database
│
├── server/                         # Game Server
│   ├── gameServer.js               # Main game logic
│   ├── systems/                    # Modular game systems
│   │   ├── weaponSystem.js
│   │   ├── weaponDefinitions.js
│   │   ├── characterUpgrades.js
│   │   ├── accountUpgrades.js
│   │   └── characterManager.js
│   ├── scenes/                     # JSON world definitions
│   │   ├── hub_world.json
│   │   └── dungeon_corridor.json
│   └── schemas/
│       └── scene.schema.json
│
├── docker-compose.yaml             # 4 services orchestration
│
└── Documentation/
    ├── README.md                   # This file
    ├── ARCHITECTURE.md             # System architecture
    ├── CONTRIBUTING.md             # Development workflow
    ├── WORLD_CREATION_GUIDE.md     # Create worlds
    ├── WEAPON_GUIDE.md             # Create weapons
    ├── CHARACTER_GUIDE.md          # Manage characters
    └── SCENE_QUICK_START.md        # Scene schema reference
```


## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

```bash
# Clone the repository
git clone <repo-url>
cd dungeon-crawler

# Start all services
docker-compose up

# Access the application
# Profile Server: http://localhost:3000
# Game Server:    http://localhost:3030
# Game Client:    http://localhost:5173
```

### Running Locally (Development)

```bash
# Terminal 1 - Profile Server
cd client
npm install
npm start

# Terminal 2 - Game Server
cd server
npm install
npm start

# Terminal 3 - Game Client
cd client/game-client
npm install
npm run dev
```

### First Time Setup

1. Navigate to `http://localhost:3000`
2. Click "Register" and create an account
3. Choose your character shape and color
4. Click "Enter Dungeon" to join the game


## 📖 Documentation Quick Start

### 🎯 **I Want To...**

#### **Understand the System**
→ Read **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture, data flow, and design principles

#### **Create Game Worlds**
→ Read **[WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md)** - Build levels, add lighting, create environments

#### **Design Weapons**
→ Read **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** - Create weapons, balance stats, design upgrades

#### **Manage Characters**
→ Read **[CHARACTER_GUIDE.md](CHARACTER_GUIDE.md)** - Character progression, upgrades, customization

#### **Contribute Code**
→ Read **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow, code style, testing

#### **Scene JSON Reference**
→ Read **[SCENE_QUICK_START.md](SCENE_QUICK_START.md)** - Technical scene schema documentation

#### **Testing & CI/CD**
→ Read **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Unit tests, integration tests, E2E tests, and automation


## 📚 Full Documentation Index

| Guide | Purpose | Audience | Lines |
|-------|---------|----------|-------|
| **[README.md](README.md)** | Project overview & quick start | Everyone | 650+ |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design & architecture | Developers | 850+ |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Development workflow | Contributors | 670+ |
| **[WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md)** | Create & edit game worlds | Level Designers | 450+ |
| **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** | Create & balance weapons | Game Designers | 400+ |
| **[CHARACTER_GUIDE.md](CHARACTER_GUIDE.md)** | Character systems & progression | Game Designers | 450+ |
| **[SCENE_QUICK_START.md](SCENE_QUICK_START.md)** | Scene JSON schema reference | Technical | 390+ |
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | Testing & CI/CD automation | Developers/QA | 900+ |

**Total Documentation**: ~4,700+ lines


## 🎓 Learning Paths

### For New Developers
1. **Start**: [README.md](README.md) - Get overview
2. **Understand**: [ARCHITECTURE.md](ARCHITECTURE.md) - Learn architecture
3. **Contribute**: [CONTRIBUTING.md](CONTRIBUTING.md) - Learn workflow
4. **Specialize**: Choose your focus area guide

**Time to Productivity**: 2-4 hours

### For Game Designers
1. **Start**: [README.md](README.md) - Get overview
2. **Weapons**: [WEAPON_GUIDE.md](WEAPON_GUIDE.md) - Design combat
3. **Characters**: [CHARACTER_GUIDE.md](CHARACTER_GUIDE.md) - Design progression
4. **Reference**: [ARCHITECTURE.md](ARCHITECTURE.md) - Understand systems

**Time to Productivity**: 1-3 hours

### For Level Designers
1. **Start**: [README.md](README.md) - Get overview
2. **Learn**: [WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md) - Build worlds
3. **Reference**: [SCENE_QUICK_START.md](SCENE_QUICK_START.md) - Schema details
4. **Create**: Build your first world!

**Time to Productivity**: 1-2 hours


## 🚀 Quick Examples

### Create a World
```bash
# 1. Create JSON file
cd server/scenes
touch my_dungeon.json

# 2. Edit JSON (see WORLD_CREATION_GUIDE.md)
# 3. Refresh browser - no rebuild needed!
```

### Create a Weapon
```javascript
// server/systems/weaponDefinitions.js
myWeapon: {
  type: 'myWeapon',
  name: 'My Weapon',
  baseStats: {
    attackRadius: 5.0,
    attackCooldown: 1000,
    baseDamage: 20,
    damageVariation: 5,
    maxTargets: 2,
    attackShape: 'circle'
  },
  upgradePath: {
    radius: { increment: 0.5, max: 12.0 },
    damage: { increment: 5, max: 150 },
    cooldown: { increment: -50, min: 300 },
    maxTargets: { increment: 1, max: 8 }
  }
}
```

See **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** for complete details.

### Create a Character
```javascript
// In game (browser console)
socket.emit('createCharacter', {
  name: 'My Warrior',
  shape: 'cube',
  color: '#ff0000'
})
```

See **[CHARACTER_GUIDE.md](CHARACTER_GUIDE.md)** for complete details.


## ⚡ Key Systems Overview

> **Note**: For complete documentation, see the dedicated guides above. This is a brief overview only.

###  Weapon System
- **Auto-attack** every cooldown  
- **Radius targeting** finds enemies  
- **Piercing** hits multiple targets  
- **Upgrades**: damage, radius, cooldown, pierce  
→ **[Full Guide](WEAPON_GUIDE.md)**

### Character System
- **5 characters max** per account  
- **Persistent progression** (XP, level, kills, deaths)  
- **Primary character** auto-selected on login  
→ **[Full Guide](CHARACTER_GUIDE.md)**

### Scene System
- **JSON-based worlds** with hot-reload  
- **No rebuild needed** - just edit and refresh  
- **Industry-standard** schema  
→ **[Full Guide](WORLD_CREATION_GUIDE.md)**

### Combat System
- **100ms server tick** checks all players  
- **Visual indicators** (radius, boxes, damage numbers)  
- **Server-authoritative** prevents cheating  
→ **[Architecture Guide](ARCHITECTURE.md)**

### Party System
- **Create/join parties** for dungeons  
- **Leader starts** dungeon  
- **Party chat** for coordination  
→ **[Architecture Guide](ARCHITECTURE.md)**


## 🗺️ Development Roadmap

### Phase 1: Core Stability ✅ (Current)
- [x] Real-time networking
- [x] Vampire Survivors combat
- [x] Party system
- [x] Character management
- [x] Hub world + dungeons
- [x] React client with Three.js

### Phase 2: Polish & QoL
- [ ] Jump & gravity mechanics
- [ ] More weapon types (5-10 total)
- [ ] Enemy variety (3-5 types)
- [ ] Improved UI animations
- [ ] Sound effects & music
- [ ] Mini-map

### Phase 3: Production Ready 
- [ ] PostgreSQL/MongoDB migration
- [ ] Input validation (Zod schemas)
- [ ] Anti-cheat measures
- [ ] Rate limiting
- [ ] Error handling & logging
- [ ] Unit tests

### Phase 4: Scalability 
- [ ] Redis for shared state
- [ ] Server sharding
- [ ] Spatial partitioning
- [ ] Message batching
- [ ] Load balancing

### Phase 5: Content Expansion (Ongoing)
- [ ] More dungeon types
- [ ] Boss fights
- [ ] Loot & equipment system
- [ ] Crafting
- [ ] Guilds
- [ ] Trading
- [ ] PvP arena

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](CONTRIBUTING.md)** for:
- Code style guidelines
- Development workflow
- Testing procedures
- Pull request process
- System architecture overview

**Quick Start for Contributors**:
1. Fork the repository
2. Read [CONTRIBUTING.md](CONTRIBUTING.md)
3. Choose a task from the roadmap
4. Create a feature branch
5. Submit a pull request

