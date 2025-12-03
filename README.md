# 🎮 Dungeon Crawler MMO Boilerplate

A production-ready MMO boilerplate with **Vampire Survivors-style combat**, real-time multiplayer, and instanced dungeons. Built with Node.js, Socket.IO, Three.js, and React.

**⭐ Fork this repository to start building your own MMO game!**

---

## ✨ What's Included

### Core Systems (Ready to Use)
- ⚔️ **Auto-targeting Combat** - Radius-based attacks, piercing, upgrade system
- 🌍 **Hub + Instanced Dungeons** - Social spaces and party-based instances
- 💥 **Party System** - Create/join parties with leader controls
- 💬 **Real-time Chat** - Hub chat, party chat, floating speech bubbles
- 🎭 **Multi-character System** - Up to 5 characters per account
- 📈 **Progression** - Character leveling, in-match upgrades, account unlocks
- 🗡️ **Weapon System** - Extensible weapon definitions with upgrade paths
- 🔐 **Play Ticket Auth** - Session-backed, short-lived ticket validation

### Technical Stack
- **Frontend**: React + Three.js + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Database**: SQLite (easily swappable)
- **Deployment**: Docker Compose (4 services)
- **Architecture**: MMO-style state sync with server authority

---

## 🏗️ Architecture

```
┌─────────────┬─────────────┬─────────────┬──────────────────────┐
│ Profile     │ Profile     │ Game Server │ Game Client          │
│ Client      │ API         │             │ (React/Three.js)     │
│ (React)     │ (Express)   │ (Socket.IO) │                      │
│ Port: 3000  │ Port: 3001  │ Port: 3030  │ Port: 5173           │
│ ─────────   │ ─────────   │ ─────────   │ ─────────            │
│ • Login UI  │ • Auth API  │ • Gameplay  │ • 3D Rendering       │
│ • Register  │ • Sessions  │ • Combat    │ • Game UI            │
│ • Dashboard │ • SQLite    │ • Parties   │ • Socket Client      │
└─────────────┴─────────────┴─────────────┴──────────────────────┘
```

**See [ARCHITECTURE.md](ARCHITECTURE.md) for complete system design.**

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone <your-fork-url>
cd dungeon-crawler

# Start all services
docker-compose up

# Access the application
# Profile UI:  http://localhost:3000
# Game Client: http://localhost:5173
```

### Local Development

```bash
# Terminal 1 - Profile Server
cd client
npm install && npm start

# Terminal 2 - Game Server
cd server
npm install && npm start

# Terminal 3 - Game Client
cd client/game-client
npm install && npm run dev
```

---

## 📖 Documentation

| Guide | Purpose |
|-------|---------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design & data flow (850+ lines) |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Development workflow (670+ lines) |
| **[WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md)** | Build game worlds (450+ lines) |
| **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** | Create weapons (400+ lines) |
| **[CHARACTER_GUIDE.md](CHARACTER_GUIDE.md)** | Character systems (450+ lines) |
| **[SCENE_QUICK_START.md](SCENE_QUICK_START.md)** | Scene schema reference (390+ lines) |
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | Testing & CI/CD (900+ lines) |

**Total**: 4,700+ lines of comprehensive documentation

---

## 🎯 Quick Examples

### Create a New World
```bash
cd server/scenes
touch my_dungeon.json
# Edit JSON (hot-reload, no rebuild needed)
```

### Add a New Weapon
```javascript
// server/systems/weaponDefinitions.js
myWeapon: {
  type: 'myWeapon',
  name: 'Fire Sword',
  baseStats: {
    attackRadius: 5.0,
    attackCooldown: 1000,
    baseDamage: 20,
    damageVariation: 5,
    maxTargets: 2
  },
  upgradePath: { /* ... */ }
}
```

**See [WEAPON_GUIDE.md](WEAPON_GUIDE.md) for complete details.**

---

## 🛠️ Customization Guide

### Replace Placeholder Content

1. **Game Assets**: Replace Three.js geometries in `client/game-client/src/utils/SceneLoader.js`
2. **UI Theme**: Edit Tailwind config in `client/game-client/tailwind.config.js`
3. **Game Balance**: Modify `server/systems/weaponDefinitions.js` and `characterUpgrades.js`
4. **World Design**: Edit JSON files in `server/scenes/`
5. **Database**: Swap SQLite for PostgreSQL/MongoDB in `client/apiServer.js`

### Extend Core Systems

- **New Weapon Types**: Follow [WEAPON_GUIDE.md](WEAPON_GUIDE.md)
- **New Enemy Types**: Modify `server/gameServer.js` enemy spawning logic
- **New Progression**: Edit `server/systems/accountUpgrades.js`
- **New Scenes**: Follow [WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md)

---

## 🗂️ Directory Structure

```
dungeon-crawler/
├── client/
│   ├── profile-client/          # Login/register UI
│   ├── game-client/             # Game UI + Three.js
│   ├── apiServer.js             # Auth API
│   └── db/                      # SQLite database
├── server/
│   ├── gameServer.js            # Main game logic
│   ├── systems/                 # Weapons, upgrades, characters
│   └── scenes/                  # World JSON definitions
├── docker-compose.yaml          # 4-service orchestration
└── Documentation/               # 4,700+ lines of guides
```

---

## ⚡ Key Features

| Feature | Description | Config File |
|---------|-------------|-------------|
| **Combat** | Auto-attack, radius targeting, piercing | `weaponDefinitions.js` |
| **Worlds** | JSON-based, hot-reload | `server/scenes/*.json` |
| **Progression** | XP, levels, upgrades | `characterUpgrades.js`, `accountUpgrades.js` |
| **Parties** | Create/join, leader controls | `gameServer.js` |
| **Characters** | 5 per account, persistent | `characterManager.js` |

---

## 🤝 Contributing

This is a **template repository**. Fork it and build your own game!

If you want to contribute improvements to the boilerplate itself:
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Create a feature branch
3. Submit a pull request

---

## 📋 Production Checklist

Before deploying to production, consider:

- [ ] Replace SQLite with PostgreSQL/MongoDB
- [ ] Add input validation (Zod schemas)
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Set up logging (Winston/Pino)
- [ ] Write unit tests (Jest)
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Set up Redis for shared state
- [ ] Implement anti-cheat measures

**See [TESTING_GUIDE.md](TESTING_GUIDE.md) for testing strategies.**

---

## 📄 License

MIT License - Fork freely and build amazing games!

---

## 🚀 Start Building

1. **Fork this repository**
2. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** to understand the systems
3. **Choose your focus**: Worlds, weapons, characters, or core systems
4. **Build your game!**

**Questions?** Check the documentation guides or open an issue.

**⭐ If this boilerplate helped you, give it a star!**
