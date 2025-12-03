# 🤝 Contributing to Dungeon Crawler MMO

Thank you for your interest in contributing! This guide will help you get started.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Project Architecture](#project-architecture)
- [Common Tasks](#common-tasks)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

---

## 🚀 Getting Started

### Prerequisites

- **Docker & Docker Compose** (for production-like environment)
- **Node.js 20+** (for local development)
- **Git** (version control)
- **Code Editor** (VS Code recommended)

### Initial Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd dungeon-crawler

# 2. Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..
cd client/game-client && npm install && cd ../..

# 3. Start with Docker (easiest)
docker-compose up

# OR run locally (3 terminals)
# Terminal 1: Profile Server
cd client && npm start

# Terminal 2: Game Server  
cd server && npm start

# Terminal 3: React Game Client
cd client/game-client && npm run dev
```

### Project URLs

- **Profile Server**: http://localhost:3000 (Login/Auth)
- **Game Server**: http://localhost:3030 (Socket.IO)
- **Game Client**: http://localhost:5173 (React/Three.js)

---

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- **Scene editing**: Edit `server/scenes/*.json` → Just refresh browser!
- **Server logic**: Edit `server/*.js` → Restart server
- **Client UI**: Edit `client/game-client/src/**` → Vite hot-reloads automatically
- **Systems**: Edit `server/systems/*.js` → Restart server

### 3. Test Your Changes

```bash
# Test with multiple browser windows (different accounts)
# Open http://localhost:3000 in 3-4 tabs to simulate multiplayer
```

### 4. Commit

```bash
git add .
git commit -m "feat: Add new weapon type 'Lightning Bolt'"
```

**Commit Message Format**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic change)
- `refactor:` Code restructuring
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Build/tooling changes

---

## 📝 Code Style Guide

### JavaScript

```javascript
// ✅ Good
const calculateDamage = (baseDamage, multiplier = 1.0) => {
  const variance = Math.random() * 5
  return Math.floor((baseDamage + variance) * multiplier)
}

// ❌ Bad
function calculateDamage(bd,m){return bd*m}
```

**Rules**:
- Use `const` by default, `let` when reassignment is needed
- No `var`
- Meaningful variable names (no single letters except loops)
- Arrow functions for callbacks
- Template literals over string concatenation
- Always use semicolons
- 2-space indentation

### JSDoc Comments

```javascript
/**
 * Calculate damage with variation and multipliers
 * @param {number} baseDamage - Base damage value
 * @param {number} multiplier - Damage multiplier (default: 1.0)
 * @returns {number} Calculated damage value
 */
const calculateDamage = (baseDamage, multiplier = 1.0) => {
  // implementation
}
```

### React Components

```javascript
// ✅ Good
import { useState, useEffect } from 'react'

export default function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null)
  
  useEffect(() => {
    // Effect logic
  }, [dependency])
  
  return <div>{/* JSX */}</div>
}

// ❌ Bad - No prop destructuring, no exports
function MyComponent(props) {
  return <div>{props.prop1}</div>
}
```

### Socket.IO Events

```javascript
// ✅ Good - Clear event names, data validation
socket.on('upgradeWeapon', (data) => {
  if (!data || !data.upgradeType) {
    socket.emit('error', { message: 'Invalid upgrade data' })
    return
  }
  
  const { upgradeType, amount = 1 } = data
  // Handle upgrade
})

// ❌ Bad - Unclear names, no validation
socket.on('uw', (d) => {
  // Handle without checking data
})
```

---

## 🏗️ Project Architecture

### File Organization

```
When adding new features, follow this structure:

server/
  systems/               ← Game logic modules
    myNewSystem.js       ← Create new system here
    README.md            ← Document your system here
  scenes/                ← World definitions
    my_dungeon.json      ← Add new scenes here
  gameServer.js          ← Wire up socket events here

client/game-client/src/
  components/            ← React components
    tabs/                ← UI tab components
    GameCanvas.jsx       ← Three.js rendering
  hooks/                 ← Custom React hooks
  stores/                ← Zustand state management
  utils/                 ← Utility classes
```

### Data Flow

```
User Input → React Component → Socket.IO → Game Server
                                              ↓
                                          Game State
                                              ↓
                                          Broadcast
                                              ↓
React Component ← Socket.IO ← All Clients
    ↓
Three.js Scene
```

---

## 🛠️ Common Tasks

### Adding a New Weapon

**1. Define in `server/systems/weaponDefinitions.js`**:

```javascript
myWeapon: {
  type: 'myWeapon',
  name: 'My Awesome Weapon',
  baseStats: {
    attackRadius: 5.0,
    attackCooldown: 1000,
    baseDamage: 20,
    damageVariation: 5,
    maxTargets: 2,
    attackShape: 'circle' // or 'cone'
  },
  upgradePath: {
    radius: { increment: 0.5, max: 12.0 },
    damage: { increment: 5, max: 150 },
    cooldown: { increment: -50, min: 300 },
    maxTargets: { increment: 1, max: 8 }
  }
}
```

**2. Test**:
```javascript
// In game client console
socket.emit('changeWeapon', 'myWeapon')
```

---

### Creating a New Scene

**1. Create `server/scenes/my_scene.json`**:

```json
{
  "meta": {
    "id": "my_scene",
    "version": "1.0.0",
    "type": "dungeon",
    "name": "My Custom Dungeon",
    "description": "An awesome dungeon"
  },
  "environment": {
    "spawn": { "position": [0, 1, 0] },
    "skybox": { "type": "color", "color": "0x1a0505" },
    "ambient": { "color": "0x606060", "intensity": 0.8 }
  },
  "lights": [
    {
      "id": "main-light",
      "type": "directional",
      "color": "0xffffff",
      "intensity": 1.5,
      "position": [10, 20, 10],
      "target": [0, 0, 0],
      "castShadow": true
    }
  ],
  "nodes": [
    {
      "id": "floor",
      "type": "mesh",
      "geometry": {
        "primitive": "plane",
        "parameters": { "width": 50, "height": 50 }
      },
      "material": {
        "type": "standard",
        "color": "0x2a1a1f",
        "roughness": 0.8
      },
      "transform": {
        "position": [0, 0, 0],
        "rotation": [-1.5708, 0, 0]
      },
      "rendering": {
        "receiveShadow": true
      }
    }
  ]
}
```

**2. Load in `GameCanvas.jsx`**:

```javascript
// In the loadSceneAsync function
if (inDungeon) {
  sceneId = 'my_scene' // Load your scene
}
```

**3. Test**: Just refresh the browser - no rebuild needed!

**See**: `SCENE_QUICK_START.md` for full scene creation guide.

---

### Adding a Character Upgrade

**1. Add to `server/systems/characterUpgrades.js`**:

```javascript
upgradeMyNewStat(player, amount) {
  if (!player.upgrades) player.upgrades = {}
  
  player.upgrades.myNewStat = (player.upgrades.myNewStat || 0) + amount
  
  return {
    success: true,
    newValue: player.upgrades.myNewStat
  }
}
```

**2. Add socket handler in `server/gameServer.js`**:

```javascript
socket.on('upgradeMyNewStat', (data) => {
  const player = players.get(socket.id)
  if (!player) return
  
  const result = characterUpgrades.upgradeMyNewStat(player, data.amount)
  socket.emit('upgradeMyNewStatResponse', result)
})
```

**3. Add UI in `client/game-client/src/components/tabs/StatsTab.jsx`**:

```javascript
<button onClick={() => socket.emit('upgradeMyNewStat', { amount: 10 })}>
  Upgrade My New Stat
</button>
```

---

### Adding a New Enemy Type

**1. Define enemy in `server/gameServer.js` (startDungeon function)**:

```javascript
room.enemies.push({
  id: `enemy_${roomId}_${i}`,
  type: 'skeleton',         // New type
  health: 120,
  maxHealth: 120,
  position: {
    x: (Math.random() - 0.5) * 15,
    y: 0.5,
    z: (Math.random() - 0.5) * 15
  },
  damage: 15,               // Damage per attack
  attackRange: 2,           // Attack range
  speed: 0.05,              // Movement speed
  xpReward: 25              // XP on kill
})
```

**2. Update client rendering in `GameCanvas.jsx`**:

```javascript
// In the enemies sync useEffect
let geometry
if (enemy.type === 'skeleton') {
  geometry = new THREE.BoxGeometry(0.8, 2, 0.8) // Tall skeleton
} else {
  geometry = new THREE.BoxGeometry(1, 1, 1)
}
```

---

## 🧪 Testing

### Manual Testing

**Multiplayer Testing**:
1. Open 3-4 browser windows
2. Create different accounts
3. Test interactions:
   - Do players see each other?
   - Does movement sync?
   - Do combat effects appear for all?
   - Does chat work?

**Combat Testing**:
1. Create a party
2. Start dungeon
3. Test weapon upgrades
4. Verify damage numbers appear
5. Check enemy health updates

**Character System Testing**:
1. Create 5 characters (max)
2. Switch between them
3. Delete a character
4. Set primary character
5. Verify persistence after logout

### Automated Testing

```bash
# Run server tests (when available)
cd server
npm test

# Run client tests (when available)
cd client/game-client
npm test
```

---

## 📤 Submitting Changes

### Pre-Submission Checklist

- [ ] Code follows style guide
- [ ] No console.log() debug statements
- [ ] No commented-out code blocks
- [ ] Tested with multiple clients
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear

### Pull Request Process

1. **Push your branch**:
   ```bash
   git push origin feature/my-feature
   ```

2. **Create PR** on GitHub with:
   - Clear title
   - Description of changes
   - Screenshots/GIFs (if UI changes)
   - Testing steps

3. **Address feedback**:
   - Make requested changes
   - Push updates
   - Respond to comments

4. **Merge**: Once approved, squash and merge

---

## 🐛 Debugging Tips

### Server Issues

```bash
# Check server logs
docker-compose logs server -f

# Check if server is running
curl http://localhost:3030/health
```

### Client Issues

```bash
# Check browser console (F12)
# Look for:
# - Socket.IO connection errors
# - Three.js errors
# - JavaScript exceptions
```

### Common Issues

**"Players not appearing"**:
- Check if Socket.IO is connected (connection status indicator)
- Verify `playerMesh.userData.isPlayer = true` is set
- Check if `clearScene()` is removing players

**"Lights not working"**:
- Ensure `renderer.physicallyCorrectLights = true`
- Check point light intensity (needs 30-100+)
- Verify `castShadow` is set correctly

**"Scene not loading"**:
- Check JSON syntax (use a validator)
- Verify file is in `server/scenes/`
- Check browser network tab for 404 errors
- Ensure server volume is mounted in docker-compose

**"State not syncing"**:
- Check Socket.IO events are being emitted
- Verify broadcast is happening to correct room/area
- Check client is listening for the event

---

## 📚 Additional Resources

- **Three.js Docs**: https://threejs.org/docs/
- **Socket.IO Docs**: https://socket.io/docs/
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 💬 Communication

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Features**: Open a GitHub Issue with `[Feature Request]`

---

## 🎉 Thank You!

Your contributions make this project better for everyone. Happy coding! 🚀

