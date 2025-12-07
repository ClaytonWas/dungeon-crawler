<div align="center">

# 🎮 Dungeon Crawler MMO

### A Production-Ready Multiplayer Game Boilerplate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![Three.js](https://img.shields.io/badge/Three.js-3D-orange.svg)](https://threejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

**Build your own MMO with Vampire Survivors-style combat, real-time multiplayer, and instanced dungeons.**

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [Features](#-features) • [Contributing](#-contributing)

<img src="https://img.shields.io/badge/Status-Active_Development-brightgreen" alt="Status">

</div>

---

## 🎯 What is this?

This is a **fully-featured MMO game boilerplate** designed as a foundation for building multiplayer games. It includes complete implementations of core MMO systems that would typically take months to build from scratch.

**Perfect for:**
- 🎮 Game developers wanting a multiplayer foundation
- 📚 Developers learning real-time game architecture
- 🚀 Startups prototyping multiplayer game ideas
- 🔧 Anyone interested in Socket.IO/WebSocket game patterns

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎮 Core Gameplay
- ⚔️ **Vampire Survivors Combat** - Auto-targeting, radius-based attacks, piercing, upgrades
- 🌍 **Persistent Hub World** - Social hub where all players gather
- 🏰 **Instanced Dungeons** - Party-based dungeon runs
- 👥 **Party System** - Create/join parties, party-only chat
- 💬 **Tabbed Chat System** - Global and party chat
- 🎭 **Multiple Characters** - Up to 5 characters per account

</td>
<td width="50%">

### 📈 Progression Systems
- 📊 **Character Leveling** - Persistent XP, levels, kills, deaths
- ⚡ **In-Match Upgrades** - Temporary buffs that reset after dungeon
- 🔓 **Account Upgrades** - Permanent unlocks and stat boosts
- 🗡️ **Weapon System** - Multiple weapon types with upgrade paths
- 💎 **Loot Drops** - Enemy drops (foundation ready for item system)

</td>
</tr>
<tr>
<td width="50%">

### 🔒 Security & Auth
- 🔐 **Session Management** - Database-backed with view/terminate
- 🚫 **Concurrent Login Prevention** - Blocks duplicate sessions
- ⚡ **Force Login** - Option to kick existing session
- 🔑 **Secure Password Change** - With current password verification
- 🎫 **Play Ticket Auth** - Short-lived tokens for game server

</td>
<td width="50%">

### ⚙️ Technical Features
- 🔄 **Real-time State Sync** - MMO-style concurrent updates
- 🎨 **Modern UI** - React + Tailwind CSS dark theme
- 🎮 **3D Graphics** - Three.js with camera controls
- 🐳 **Docker Deployment** - Multi-service containerized
- 🌐 **LAN Support** - Auto-detects hostname for local play

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Three.js, Tailwind CSS, Vite, Zustand |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | SQLite (easily swappable to PostgreSQL/MongoDB) |
| **DevOps** | Docker, Docker Compose, Jest, Playwright |
| **Architecture** | MMO-style state sync with server authority |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DUNGEON CRAWLER MMO                           │
├─────────────┬─────────────┬─────────────┬──────────────────────────────────┤
│   Profile   │   Profile   │    Game     │          Game Client             │
│   Client    │    API      │   Server    │       (React/Three.js)           │
│   (React)   │  (Express)  │ (Socket.IO) │                                  │
│  Port 3000  │  Port 3001  │  Port 3030  │          Port 5173               │
├─────────────┼─────────────┼─────────────┼──────────────────────────────────┤
│ • Login UI  │ • Auth API  │ • Gameplay  │ • 3D Rendering                   │
│ • Register  │ • Sessions  │ • Combat    │ • Real-time Game UI              │
│ • Dashboard │ • SQLite DB │ • Parties   │ • WebSocket Client               │
└─────────────┴─────────────┴─────────────┴──────────────────────────────────┘
```

> 📖 **[View Full Architecture Documentation →](ARCHITECTURE.md)** (850+ lines of detailed system design)

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js](https://nodejs.org/) 20+ (for local development)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/ClaytonWas/dungeon-crawler.git
cd dungeon-crawler

# Start all services
docker-compose up

# Access the application
# Profile UI:  http://localhost:3000
# Game Client: http://localhost:5173
```

### Option 2: Local Development

```bash
# Terminal 1 - Profile Server (Auth API)
cd client
npm install && npm start

# Terminal 2 - Game Server (Socket.IO)
cd server
npm install && npm start

# Terminal 3 - Game Client (Vite + React)
cd client/game-client
npm install && npm run dev
```

---

## 📖 Documentation

This project includes **4,700+ lines** of comprehensive documentation:

| Guide | Description |
|-------|-------------|
| 📐 **[ARCHITECTURE.md](ARCHITECTURE.md)** | Complete system design, data flow, and component interactions |
| 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)** | Development workflow, code standards, and PR guidelines |
| 🌍 **[WORLD_CREATION_GUIDE.md](WORLD_CREATION_GUIDE.md)** | Create custom game worlds with JSON schemas |
| ⚔️ **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** | Design and implement new weapon systems |
| 👤 **[CHARACTER_GUIDE.md](CHARACTER_GUIDE.md)** | Character creation, stats, and progression |
| 🎬 **[SCENE_QUICK_START.md](SCENE_QUICK_START.md)** | Quick reference for scene configuration |
| 🧪 **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | Testing strategies, Jest, and Playwright setup |

---

## 🎯 Quick Examples

<details>
<summary><b>🌍 Create a New World</b></summary>

```bash
# Create a new scene file
cd server/scenes
touch my_dungeon.json
```

Scene files support hot-reload — no rebuild needed!

</details>

<details>
<summary><b>⚔️ Add a New Weapon</b></summary>

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

> 📖 See **[WEAPON_GUIDE.md](WEAPON_GUIDE.md)** for complete weapon creation docs.

</details>

<details>
<summary><b>🎨 Customize the UI Theme</b></summary>

Edit `client/game-client/tailwind.config.js` to customize colors, fonts, and spacing.

</details>

---


## 📁 Project Structure

```
dungeon-crawler/
├── 📁 client/
│   ├── 📁 profile-client/       # Login/Register UI (React + Vite)
│   ├── 📁 game-client/          # Game UI + Three.js rendering
│   ├── 📄 apiServer.js          # Auth API (Express)
│   └── 📁 db/                   # SQLite database & schemas
│
├── 📁 server/
│   ├── 📄 gameServer.js         # Main game logic (Socket.IO)
│   ├── 📁 systems/              # Combat, weapons, characters, upgrades
│   └── 📁 scenes/               # World definitions (JSON)
│
├── 📄 docker-compose.yaml       # 4-service orchestration
└── 📚 Documentation             # 4,700+ lines of guides
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests
npm run test:frontend

# E2E tests with Playwright
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 🤝 Contributing

Contributions are welcome! This is a template repository — fork it to build your own game, or contribute improvements to the boilerplate.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

> 📖 See **[CONTRIBUTING.md](CONTRIBUTING.md)** for detailed guidelines.

---

## 📋 Production Checklist

<details>
<summary><b>View production readiness checklist</b></summary>

Before deploying to production:

- [ ] Replace SQLite with PostgreSQL/MongoDB
- [ ] Add input validation (Zod schemas)
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Set up logging (Winston/Pino)
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Set up Redis for shared state
- [ ] Implement anti-cheat measures
- [ ] Add monitoring and alerting

> 📖 See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** for testing strategies.

</details>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

You are free to use this boilerplate for personal and commercial projects.

---

<div align="center">

## 🚀 Ready to Build Your Game?

**Fork this repository and start building!**

[![GitHub stars](https://img.shields.io/github/stars/ClaytonWas/dungeon-crawler?style=social)](https://github.com/ClaytonWas/dungeon-crawler)

---

Made with ❤️ for the game dev community

</div>
