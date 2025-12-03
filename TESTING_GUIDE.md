# 🧪 Testing & CI/CD Guide

Comprehensive guide to testing and automation for the Dungeon Crawler MMO.

---

## 📋 Table of Contents

- [Testing Strategy](#testing-strategy)
- [Getting Started](#getting-started)
  - [Step 1: Backend Tests](#step-1-add-backend-tests)
  - [Step 2: Frontend Tests](#step-2-add-frontend-tests)
  - [Step 3: E2E Tests](#step-3-add-e2e-tests)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Coverage](#code-coverage)
- [Best Practices](#best-practices)

---

## 🎯 Testing Strategy

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  ← Few (5-10 critical flows)
        │  (Playwright)│
        └─────────────┘
       ┌───────────────┐
       │Integration Tests│ ← Some (20-30 tests)
       │(Jest + Supertest)│
       └───────────────┘
    ┌───────────────────┐
    │   Unit Tests       │  ← Many (100+ tests)
    │   (Jest + Vitest)  │
    └───────────────────┘
```

### Coverage Goals

| Layer | Coverage Target | Why |
|-------|-----------------|-----|
| **Backend Logic** | 80%+ | Critical game logic |
| **Frontend Utils** | 70%+ | Core utilities |
| **Frontend Components** | 60%+ | UI components |
| **E2E Critical Flows** | 100% | User journeys |

---


## 🚀 Getting Started

Now that your testing infrastructure is working, let's add comprehensive test coverage to your project. This guide walks you through adding tests step-by-step.

### Current Status ✅

You already have:
- ✅ Jest configured for backend
- ✅ 13 passing weapon system tests
- ✅ 42 passing character manager tests
- ✅ 44 passing character upgrades tests
- ✅ 55 passing combat system tests
- ✅ 26 passing profile API tests
- ✅ **180 total tests passing** 🎉
- ✅ CI/CD pipeline ready (`.github/workflows/ci.yml`)
- ✅ Test scripts in `package.json`

---

## Step 1: Add Backend Tests

The character manager and upgrade systems are critical - let's test them!

### ✅ Character Manager - COMPLETE (42 tests)

```bash
# Already implemented!
server/systems/__tests__/characterManager.test.js
```

**Covers**:
- ✅ Creating characters (default, custom, limit enforcement)
- ✅ Getting characters (by ID, all, primary)
- ✅ Updating characters (stats, experience, metadata)
- ✅ Deleting characters (with safeguards)
- ✅ Experience & leveling (XP curve, stat scaling)
- ✅ Edge cases & data integrity

### Next: Add More Backend Tests

```bash
# Go to tests directory
cd server/systems/__tests__

# Copy character manager test as template
cp characterManager.test.js accountUpgrades.test.js

# Edit the new file to test accountUpgrades
```

**Still need tests for**:
- Character Upgrades tests (10+ tests)
- Account Upgrades tests (5+ tests)
- Combat System tests (15+ tests)

### What to Test

**Character Manager** (`characterManager.js`):
- ✅ `createCharacter()` - Create with correct stats, enforce 5 limit
- ✅ `getCharacters()` - Get all user characters
- ✅ `addExperience()` - Add XP, trigger level ups
- ✅ `deleteCharacter()` - Delete, but not last one
- ✅ `setPrimaryCharacter()` - Set primary
- ✅ `incrementKills()` / `incrementDeaths()` - Update stats

**Character Upgrades** (`characterUpgrades.js`):
- ✅ `upgradeHealth()` - Increase max health
- ✅ `upgradeMovementSpeed()` - Multiply speed, stack correctly
- ✅ `upgradeDamageMultiplier()` - Multiply damage
- ✅ `upgradeDefense()` - Add defense points

**Run your tests**:
```bash
cd server
npm test                        # Run all
npm test -- characterManager    # Run specific file
npm test -- --coverage         # With coverage report
```

---

## Step 2: Add Frontend Tests

Frontend tests ensure your React components and utilities work correctly.

### Setup (One-Time)

```bash
cd client/game-client

# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Add test script** to `client/game-client/package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Update `vite.config.js`** to enable testing:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
})
```

**Create setup file** at `client/game-client/src/test/setup.js`:
```javascript
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
})

// Mock Three.js (doesn't work in jsdom)
vi.mock('three', () => ({
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    domElement: document.createElement('canvas')
  }))
}))
```

### What to Test

**Components**:
- `RightPanel` - Tab switching, collapse/expand
- `StatsTab` - Display weapon/character stats
- `SocialTab` - Party/chat UI
- `AccountTab` - Character list, creation

**Utilities**:
- `GeometryFactory` - Create Three.js geometries
- `MaterialFactory` - Create Three.js materials
- `SceneLoader` - Load and parse scene JSON

**See the [Unit Testing](#unit-testing) section for complete component test examples.**

**Run frontend tests**:
```bash
cd client/game-client
npm test           # Run all
npm run test:ui    # Interactive UI
npm run test:coverage
```

---

## Step 3: Add E2E Tests

E2E tests verify complete user flows work end-to-end.

### Setup (One-Time)

```bash
# From project root
npm install --save-dev @playwright/test
npx playwright install
```

✅ **Playwright config already exists** at `playwright.config.js`!

### What to Test

**Critical Flows**:
1. **Authentication**: Register → Login → Enter Game
2. **Gameplay**: Move player → Create party → Start dungeon
3. **Characters**: Create → Switch → Delete
4. **Combat**: Enter dungeon → Kill enemies → Level up
5. **Chat**: Send message → Receive message

### Quick Start: Copy Template

**Create** `__tests__/e2e/authentication.spec.js`:
```javascript
import { test, expect } from '@playwright/test'

test('should register and enter game', async ({ page }) => {
  const username = `user_${Date.now()}`
  
  await page.goto('http://localhost:3000')
  await page.click('text=Register')
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', 'password123')
  await page.fill('input[name="confirmPassword"]', 'password123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL(/\/home/)
  
  await page.click('text=Enter Game')
  await expect(page).toHaveURL(/localhost:5173/)
  
  // Game canvas should load
  await expect(page.locator('canvas')).toBeVisible()
})
```

**See the [E2E Testing](#e2e-testing) section for complete flow examples.**

**Run E2E tests**:
```bash
# Make sure services are running first!
docker-compose up

# Then run tests
npm run test:e2e           # Headless
npm run test:e2e:headed    # See browser
npm run test:e2e:ui        # Interactive
```

---

## 📊 Progress Checklist

Track your testing progress:

### Backend Tests
- [x] Weapon System (13 tests) ✅
- [x] Character Manager (42 tests) ✅
- [x] Character Upgrades (44 tests) ✅
- [x] Combat System (55 tests) ✅
- [x] Profile API (26 tests) ✅
- [ ] Account Upgrades (5+ tests)
- [ ] Dungeon Generation (10+ tests)
- **Current**: 180 tests passing | **Target**: 200+ tests, 70%+ coverage

### Frontend Tests
- [ ] RightPanel component
- [ ] Tab components (Stats, Social, Account)
- [ ] GeometryFactory
- [ ] MaterialFactory
- [ ] SceneLoader
- **Target**: 60%+ coverage

### E2E Tests
- [ ] Authentication flow
- [ ] Gameplay flow
- [ ] Character management
- [ ] Combat flow
- [ ] Chat system
- **Target**: All critical flows

---

## 🎯 Quick Commands

```bash
# Backend
cd server && npm test
cd server && npm test -- --coverage

# Frontend
cd client/game-client && npm test
cd client/game-client && npm run test:ui

# E2E (ensure docker-compose up first!)
npm run test:e2e
npm run test:e2e:headed

# All tests
npm run test:all
```

---

## 📚 Next: Dive Deeper

For complete examples and advanced patterns, see the sections below:
- [Unit Testing](#unit-testing) - Full code examples
- [Integration Testing](#integration-testing) - API & Socket.IO tests  
- [E2E Testing](#e2e-testing) - Complete user flows
- [Best Practices](#best-practices) - Testing patterns

---



## 🔬 Unit Testing

### Backend (Node.js + Jest)

#### Setup

```bash
cd server
npm install --save-dev jest @types/jest
```

**`server/package.json`**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "systems/**/*.js",
      "!systems/**/*.test.js"
    ],
    "testMatch": [
      "**/__tests__/**/*.js",
      "**/*.test.js"
    ]
  }
}
```

#### Example: Weapon System Tests

**`server/systems/__tests__/weaponSystem.test.js`**:
```javascript
const weaponSystem = require('../weaponSystem')

describe('Weapon System', () => {
  describe('initializeWeapon', () => {
    it('should initialize a basic weapon with correct stats', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      
      expect(weapon).toHaveProperty('type', 'basic')
      expect(weapon).toHaveProperty('attackRadius')
      expect(weapon.attackRadius).toBeGreaterThan(0)
      expect(weapon.attackCooldown).toBeGreaterThan(0)
    })

    it('should throw error for unknown weapon type', () => {
      expect(() => {
        weaponSystem.initializeWeapon('nonexistent')
      }).toThrow()
    })
  })

  describe('upgradeWeapon', () => {
    it('should upgrade weapon damage correctly', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      const initialDamage = weapon.baseDamage
      
      const upgraded = weaponSystem.upgradeWeapon(weapon, 'damage', 1)
      
      expect(upgraded.baseDamage).toBeGreaterThan(initialDamage)
    })

    it('should respect max caps on upgrades', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      
      // Upgrade damage 1000 times (should hit max)
      let upgraded = weapon
      for (let i = 0; i < 1000; i++) {
        upgraded = weaponSystem.upgradeWeapon(upgraded, 'damage', 1)
      }
      
      const weaponDef = require('../weaponDefinitions').basic
      expect(upgraded.baseDamage).toBeLessThanOrEqual(weaponDef.upgradePath.damage.max)
    })

    it('should decrease cooldown on upgrade', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      const initialCooldown = weapon.attackCooldown
      
      const upgraded = weaponSystem.upgradeWeapon(weapon, 'cooldown', 1)
      
      expect(upgraded.attackCooldown).toBeLessThan(initialCooldown)
    })
  })

  describe('calculateDamage', () => {
    it('should calculate damage within expected range', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      const player = { upgrades: { damageMultiplier: 1.0 } }
      
      const damage = weaponSystem.calculateDamage(weapon, player)
      
      expect(damage).toBeGreaterThanOrEqual(weapon.baseDamage)
      expect(damage).toBeLessThanOrEqual(weapon.baseDamage + weapon.damageVariation)
    })

    it('should apply damage multiplier correctly', () => {
      const weapon = weaponSystem.initializeWeapon('basic')
      const player = { upgrades: { damageMultiplier: 2.0 } }
      
      const damage = weaponSystem.calculateDamage(weapon, player)
      
      expect(damage).toBeGreaterThanOrEqual(weapon.baseDamage * 2.0)
    })
  })

  describe('findTargets', () => {
    it('should find enemies within radius', () => {
      const player = {
        position: { x: 0, y: 0, z: 0 },
        weapon: weaponSystem.initializeWeapon('basic')
      }
      
      const enemies = [
        { id: '1', position: { x: 2, y: 0, z: 0 }, health: 100 },  // Within range
        { id: '2', position: { x: 20, y: 0, z: 0 }, health: 100 }, // Out of range
        { id: '3', position: { x: 0, y: 0, z: 2 }, health: 100 }   // Within range
      ]
      
      const targets = weaponSystem.findTargets(player, enemies, player.weapon)
      
      expect(targets).toHaveLength(2)
      expect(targets.map(t => t.id)).toContain('1')
      expect(targets.map(t => t.id)).toContain('3')
    })

    it('should respect maxTargets limit', () => {
      const player = {
        position: { x: 0, y: 0, z: 0 },
        weapon: { ...weaponSystem.initializeWeapon('basic'), maxTargets: 2 }
      }
      
      const enemies = Array.from({ length: 10 }, (_, i) => ({
        id: `enemy${i}`,
        position: { x: i, y: 0, z: 0 },
        health: 100
      }))
      
      const targets = weaponSystem.findTargets(player, enemies, player.weapon)
      
      expect(targets.length).toBeLessThanOrEqual(2)
    })

    it('should not target dead enemies', () => {
      const player = {
        position: { x: 0, y: 0, z: 0 },
        weapon: weaponSystem.initializeWeapon('basic')
      }
      
      const enemies = [
        { id: '1', position: { x: 1, y: 0, z: 0 }, health: 100 },
        { id: '2', position: { x: 2, y: 0, z: 0 }, health: 0 },    // Dead
        { id: '3', position: { x: 3, y: 0, z: 0 }, health: -10 }   // Dead
      ]
      
      const targets = weaponSystem.findTargets(player, enemies, player.weapon)
      
      expect(targets).toHaveLength(1)
      expect(targets[0].id).toBe('1')
    })
  })
})
```

#### Example: Character Manager Tests

**`server/systems/__tests__/characterManager.test.js`**:
```javascript
const characterManager = require('../characterManager')

describe('Character Manager', () => {
  beforeEach(() => {
    // Clear character data before each test
    characterManager.characterData.clear()
  })

  describe('createCharacter', () => {
    it('should create a character with correct initial stats', () => {
      const char = characterManager.createCharacter(123, {
        name: 'Test Warrior',
        shape: 'cube',
        color: '#ff0000'
      })
      
      expect(char).toHaveProperty('id')
      expect(char.userId).toBe(123)
      expect(char.name).toBe('Test Warrior')
      expect(char.level).toBe(1)
      expect(char.experience).toBe(0)
      expect(char.totalKills).toBe(0)
      expect(char.totalDeaths).toBe(0)
    })

    it('should set first character as primary', () => {
      const char = characterManager.createCharacter(123, {
        name: 'First Character',
        shape: 'cube',
        color: '#ff0000'
      })
      
      expect(char.isPrimary).toBe(true)
    })

    it('should enforce maximum character limit', () => {
      // Create 5 characters
      for (let i = 0; i < 5; i++) {
        characterManager.createCharacter(123, {
          name: `Character ${i}`,
          shape: 'cube',
          color: '#ff0000'
        })
      }
      
      // Try to create 6th
      const result = characterManager.createCharacter(123, {
        name: 'Sixth Character',
        shape: 'cube',
        color: '#ff0000'
      })
      
      expect(result).toBeNull()
    })
  })

  describe('addExperience', () => {
    it('should add experience correctly', () => {
      const char = characterManager.createCharacter(123, {
        name: 'Test',
        shape: 'cube',
        color: '#ff0000'
      })
      
      const result = characterManager.addExperience(char.id, 50)
      
      expect(result.leveledUp).toBe(false)
      expect(result.character.experience).toBe(50)
    })

    it('should trigger level up at threshold', () => {
      const char = characterManager.createCharacter(123, {
        name: 'Test',
        shape: 'cube',
        color: '#ff0000'
      })
      
      // Level 1 → 2 requires 100 XP
      const result = characterManager.addExperience(char.id, 100)
      
      expect(result.leveledUp).toBe(true)
      expect(result.character.level).toBe(2)
      expect(result.character.experience).toBe(0)
    })

    it('should handle multiple level ups', () => {
      const char = characterManager.createCharacter(123, {
        name: 'Test',
        shape: 'cube',
        color: '#ff0000'
      })
      
      // Give massive XP
      const result = characterManager.addExperience(char.id, 1000)
      
      expect(result.character.level).toBeGreaterThan(2)
    })
  })

  describe('setPrimaryCharacter', () => {
    it('should set primary character correctly', () => {
      const char1 = characterManager.createCharacter(123, {
        name: 'First',
        shape: 'cube',
        color: '#ff0000'
      })
      
      const char2 = characterManager.createCharacter(123, {
        name: 'Second',
        shape: 'sphere',
        color: '#00ff00'
      })
      
      characterManager.setPrimaryCharacter(123, char2.id)
      
      const characters = characterManager.getCharacters(123)
      expect(characters.find(c => c.id === char1.id).isPrimary).toBe(false)
      expect(characters.find(c => c.id === char2.id).isPrimary).toBe(true)
    })
  })

  describe('deleteCharacter', () => {
    it('should delete character successfully', () => {
      const char1 = characterManager.createCharacter(123, {
        name: 'First',
        shape: 'cube',
        color: '#ff0000'
      })
      
      const char2 = characterManager.createCharacter(123, {
        name: 'Second',
        shape: 'sphere',
        color: '#00ff00'
      })
      
      const result = characterManager.deleteCharacter(123, char1.id)
      
      expect(result).toBe(true)
      const characters = characterManager.getCharacters(123)
      expect(characters).toHaveLength(1)
      expect(characters[0].id).toBe(char2.id)
    })

    it('should not delete last character', () => {
      const char = characterManager.createCharacter(123, {
        name: 'Only',
        shape: 'cube',
        color: '#ff0000'
      })
      
      const result = characterManager.deleteCharacter(123, char.id)
      
      expect(result).toBe(false)
      const characters = characterManager.getCharacters(123)
      expect(characters).toHaveLength(1)
    })
  })
})
```

---

### Frontend (React + Vitest)

#### Setup

```bash
cd client/game-client
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**`client/game-client/vite.config.js`**:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
})
```

**`client/game-client/src/test/setup.js`**:
```javascript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
})
```

#### Example: Component Tests

**`client/game-client/src/components/__tests__/RightPanel.test.jsx`**:
```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RightPanel from '../RightPanel'

describe('RightPanel', () => {
  it('renders all tabs', () => {
    render(<RightPanel />)
    
    expect(screen.getByText(/stats/i)).toBeInTheDocument()
    expect(screen.getByText(/social/i)).toBeInTheDocument()
    expect(screen.getByText(/account/i)).toBeInTheDocument()
  })

  it('switches tabs on click', () => {
    render(<RightPanel />)
    
    const socialTab = screen.getByText(/social/i)
    fireEvent.click(socialTab)
    
    // Check if social content is visible
    expect(screen.getByText(/party/i)).toBeInTheDocument()
  })

  it('collapses panel', () => {
    render(<RightPanel />)
    
    const collapseButton = screen.getByLabelText(/collapse/i)
    fireEvent.click(collapseButton)
    
    // Panel should be collapsed
    expect(screen.queryByText(/stats/i)).not.toBeVisible()
  })
})
```

#### Example: Utility Tests

**`client/game-client/src/utils/__tests__/SceneLoader.test.js`**:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import SceneLoader from '../SceneLoader'
import * as THREE from 'three'

// Mock fetch
global.fetch = vi.fn()

describe('SceneLoader', () => {
  let sceneLoader
  let mockScene

  beforeEach(() => {
    mockScene = new THREE.Scene()
    sceneLoader = new SceneLoader('http://localhost:3030')
    
    // Reset mock
    fetch.mockReset()
  })

  it('fetches scene JSON from server', async () => {
    const mockSceneData = {
      meta: { id: 'test', version: '1.0.0', type: 'test' },
      environment: {
        spawn: { position: [0, 1, 0] },
        skybox: { type: 'color', color: '0x000000' },
        ambient: { color: '0x404040', intensity: 0.5 }
      },
      lights: [],
      nodes: []
    }
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSceneData
    })
    
    await sceneLoader.loadScene('test', mockScene)
    
    expect(fetch).toHaveBeenCalledWith('http://localhost:3030/api/scenes/test')
  })

  it('caches loaded scenes', async () => {
    const mockSceneData = {
      meta: { id: 'test', version: '1.0.0', type: 'test' },
      environment: {
        spawn: { position: [0, 1, 0] },
        skybox: { type: 'color', color: '0x000000' },
        ambient: { color: '0x404040', intensity: 0.5 }
      },
      lights: [],
      nodes: []
    }
    
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSceneData
    })
    
    // Load twice
    await sceneLoader.loadScene('test', mockScene)
    await sceneLoader.loadScene('test', mockScene)
    
    // Should only fetch once (second load from cache)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('clears scene correctly', () => {
    // Add some objects to scene
    mockScene.add(new THREE.Mesh())
    mockScene.add(new THREE.Mesh())
    
    sceneLoader.clearScene(mockScene)
    
    expect(mockScene.children).toHaveLength(0)
  })

  it('preserves player meshes when clearing', () => {
    const playerMesh = new THREE.Mesh()
    playerMesh.userData.isPlayer = true
    
    const enemyMesh = new THREE.Mesh()
    enemyMesh.userData.isEnemy = true
    
    const normalMesh = new THREE.Mesh()
    
    mockScene.add(playerMesh, enemyMesh, normalMesh)
    
    sceneLoader.clearScene(mockScene)
    
    // Should keep player and enemy, remove normal
    expect(mockScene.children).toContain(playerMesh)
    expect(mockScene.children).toContain(enemyMesh)
    expect(mockScene.children).not.toContain(normalMesh)
  })
})
```

---

## 🔗 Integration Testing

### API Integration Tests

**`client/__tests__/api.integration.test.js`**:
```javascript
const request = require('supertest')
const app = require('../apiServer')
const bcrypt = require('bcrypt')
const Database = require('better-sqlite3')

describe('Profile API Integration', () => {
  let db

  beforeAll(() => {
    // Create test database
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        shape TEXT DEFAULT 'cube',
        color TEXT DEFAULT '#00ff00',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterAll(() => {
    db.close()
  })

  describe('POST /api/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser',
          password: 'password123',
          shape: 'cube',
          color: '#ff0000'
        })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.user).toHaveProperty('username', 'testuser')
    })

    it('should reject duplicate usernames', async () => {
      await request(app)
        .post('/api/register')
        .send({
          username: 'duplicate',
          password: 'password123'
        })

      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'duplicate',
          password: 'password456'
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should hash passwords', async () => {
      const password = 'mySecretPassword'
      
      await request(app)
        .post('/api/register')
        .send({
          username: 'secureuser',
          password
        })

      const user = db.prepare('SELECT * FROM accounts WHERE username = ?').get('secureuser')
      
      expect(user.password).not.toBe(password)
      expect(await bcrypt.compare(password, user.password)).toBe(true)
    })
  })

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/register')
        .send({
          username: 'logintest',
          password: 'password123'
        })
    })

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'logintest',
          password: 'password123'
        })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.user).toHaveProperty('username', 'logintest')
    })

    it('should reject wrong password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'logintest',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/me', () => {
    it('should return user data when authenticated', async () => {
      const agent = request.agent(app)
      
      // Login first
      await agent
        .post('/api/login')
        .send({
          username: 'logintest',
          password: 'password123'
        })

      // Get user data
      const response = await agent
        .get('/api/me')
        .expect(200)

      expect(response.body).toHaveProperty('username', 'logintest')
    })

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/me')
        .expect(401)
    })
  })
})
```

### Socket.IO Integration Tests

**`server/__tests__/gameServer.integration.test.js`**:
```javascript
const io = require('socket.io-client')
const { createServer } = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

describe('Game Server Socket.IO', () => {
  let ioServer, serverSocket, clientSocket, httpServer

  beforeAll((done) => {
    httpServer = createServer()
    ioServer = new Server(httpServer)
    
    // Load your socket handlers here
    require('../gameServer')(ioServer)
    
    httpServer.listen(() => {
      const port = httpServer.address().port
      clientSocket = io(`http://localhost:${port}`)
      
      ioServer.on('connection', (socket) => {
        serverSocket = socket
      })
      
      clientSocket.on('connect', done)
    })
  })

  afterAll(() => {
    ioServer.close()
    clientSocket.close()
    httpServer.close()
  })

  describe('Authentication', () => {
    beforeEach(() => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 123, username: 'test', shape: 'cube', color: '#00ff00' } })
      })
    })

    afterEach(() => {
      global.fetch.mockRestore()
    })

    it('should authenticate with valid play ticket', (done) => {
      const authedSocket = io(`http://localhost:${httpServer.address().port}`, {
        auth: { ticket: 'valid-ticket' }
      })

      authedSocket.on('connect', () => {
        expect(global.fetch).toHaveBeenCalled()
        done()
      })
    })

    it('should reject invalid play ticket', (done) => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid ticket' })
      })

      const badSocket = io(`http://localhost:${httpServer.address().port}`, {
        auth: { ticket: 'invalid-ticket' }
      })

      badSocket.on('connect_error', (err) => {
        expect(err.message).toMatch(/Invalid Ticket/i)
        done()
      })
    })
  })

  describe('Movement', () => {
    it('should broadcast player movement', (done) => {
      clientSocket.emit('updatePlayerPosition', { x: 10, z: 20 })
      
      clientSocket.once('playerMoved', (data) => {
        expect(data.position).toEqual({ x: 10, y: expect.any(Number), z: 20 })
        done()
      })
    })
  })

  describe('Party System', () => {
    it('should create party', (done) => {
      clientSocket.emit('createParty')
      
      clientSocket.once('partyCreated', (data) => {
        expect(data).toHaveProperty('partyId')
        done()
      })
    })

    it('should allow joining party', (done) => {
      // First create a party
      clientSocket.emit('createParty')
      
      clientSocket.once('partyCreated', (data) => {
        const partyId = data.partyId
        
        // Create second client
        const client2 = io(`http://localhost:${httpServer.address().port}`)
        
        client2.emit('joinParty', partyId)
        
        client2.once('joinPartyResponse', (response) => {
          expect(response.success).toBe(true)
          expect(response.party.members).toHaveLength(2)
          client2.close()
          done()
        })
      })
    })
  })
})
```

---

## 🎭 E2E Testing (Playwright)

### Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**`playwright.config.js`**:
```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'docker-compose up',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

### Example: Critical User Flows

**`__tests__/e2e/auth.spec.js`**:
```javascript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should register new user and enter game', async ({ page }) => {
    // Navigate to home
    await page.goto('/')
    
    // Click register
    await page.click('text=Register')
    
    // Fill registration form
    await page.fill('input[name="username"]', `testuser_${Date.now()}`)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    
    // Select shape and color
    await page.click('button[data-shape="cube"]')
    await page.fill('input[type="color"]', '#ff0000')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Should redirect to home
    await expect(page).toHaveURL(/\/home/)
    await expect(page.locator('text=Welcome')).toBeVisible()
    
    // Click Enter Game
    await page.click('text=Enter Game')
    
    // Should navigate to game client
    await expect(page).toHaveURL(/localhost:5173/)
    
    // Game canvas should load
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('should login existing user', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Login')
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL(/\/home/)
  })

  test('should reject wrong password', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Login')
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Invalid')).toBeVisible()
  })
})
```

**`__tests__/e2e/gameplay.spec.js`**:
```javascript
import { test, expect } from '@playwright/test'

test.describe('Gameplay Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/')
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Enter game
    await page.click('text=Enter Game')
    await page.waitForURL(/localhost:5173/)
  })

  test('should move player with WASD', async ({ page }) => {
    const canvas = page.locator('canvas')
    await canvas.click() // Focus canvas
    
    // Press W key
    await page.keyboard.press('w')
    await page.waitForTimeout(100)
    
    // Check if player moved (you'd need to expose position for testing)
    const playerData = await page.evaluate(() => {
      return window.__GAME_STATE__.player.position
    })
    
    expect(playerData.z).toBeLessThan(0) // Moved forward
  })

  test('should create party', async ({ page }) => {
    // Open Social tab
    await page.click('text=Social')
    
    // Create party
    await page.click('button:has-text("Create Party")')
    
    // Should show party ID
    await expect(page.locator('text=Party ID:')).toBeVisible()
  })

  test('should open and close right panel', async ({ page }) => {
    const panel = page.locator('[data-testid="right-panel"]')
    
    // Panel should be visible
    await expect(panel).toBeVisible()
    
    // Click collapse
    await page.click('[aria-label="Collapse panel"]')
    
    // Panel should be hidden
    await expect(panel).not.toBeVisible()
    
    // Click expand
    await page.click('[aria-label="Expand panel"]')
    
    // Panel should be visible again
    await expect(panel).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.click('text=Stats')
    await expect(page.locator('text=Weapon Stats')).toBeVisible()
    
    await page.click('text=Social')
    await expect(page.locator('text=Party')).toBeVisible()
    
    await page.click('text=Account')
    await expect(page.locator('text=My Characters')).toBeVisible()
  })
})
```

**`__tests__/e2e/characters.spec.js`**:
```javascript
import { test, expect } from '@playwright/test'

test.describe('Character Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and enter game
    await page.goto('/')
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.click('text=Enter Game')
    await page.waitForURL(/localhost:5173/)
  })

  test('should create new character', async ({ page }) => {
    await page.click('text=Account')
    await page.click('button:has-text("Create New Character")')
    
    // Fill character form
    await page.fill('input[name="characterName"]', `Warrior_${Date.now()}`)
    await page.click('button[data-shape="sphere"]')
    await page.fill('input[type="color"]', '#00ff00')
    
    await page.click('button:has-text("Create")')
    
    // Should show success message
    await expect(page.locator('text=Character created')).toBeVisible()
  })

  test('should switch between characters', async ({ page }) => {
    await page.click('text=Account')
    
    // Get all character buttons
    const characterButtons = page.locator('button[data-character-id]')
    const count = await characterButtons.count()
    
    if (count > 1) {
      // Click second character
      await characterButtons.nth(1).click()
      
      // Should show character selected message
      await expect(page.locator('text=Character selected')).toBeVisible()
    }
  })

  test('should respect 5 character limit', async ({ page }) => {
    await page.click('text=Account')
    
    // Try to create 6 characters
    for (let i = 0; i < 6; i++) {
      await page.click('button:has-text("Create New Character")')
      await page.fill('input[name="characterName"]', `Char_${i}`)
      await page.click('button:has-text("Create")')
      
      if (i >= 5) {
        // 6th attempt should fail
        await expect(page.locator('text=Maximum characters reached')).toBeVisible()
      }
    }
  })
})
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions

**`.github/workflows/ci.yml`**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  # Backend Tests
  backend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: server/package-lock.json
    
    - name: Install dependencies
      working-directory: ./server
      run: npm ci
    
    - name: Run unit tests
      working-directory: ./server
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./server/coverage/coverage-final.json
        flags: backend

  # Profile API Tests
  profile-api-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: client/package-lock.json
    
    - name: Install dependencies
      working-directory: ./client
      run: npm ci
    
    - name: Run API tests
      working-directory: ./client
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./client/coverage/coverage-final.json
        flags: profile-api

  # Frontend Tests (Game Client)
  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: client/game-client/package-lock.json
    
    - name: Install dependencies
      working-directory: ./client/game-client
      run: npm ci
    
    - name: Run unit tests
      working-directory: ./client/game-client
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./client/game-client/coverage/coverage-final.json
        flags: frontend

  # Frontend Tests (Profile Client)
  profile-client-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: client/profile-client/package-lock.json
    
    - name: Install dependencies
      working-directory: ./client/profile-client
      run: npm ci
    
    - name: Run unit tests
      working-directory: ./client/profile-client
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./client/profile-client/coverage/coverage-final.json
        flags: profile-client

  # E2E Tests
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    
    - name: Start services
      run: docker-compose up -d
    
    - name: Wait for services
      run: npx wait-on http://localhost:3000 http://localhost:3030 http://localhost:5173 --timeout 120000
    
    - name: Run E2E tests
      run: npx playwright test
    
    - name: Upload Playwright report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
    
    - name: Stop services
      if: always()
      run: docker-compose down

  # Lint & Type Check
  lint:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: |
        cd server && npm ci
        cd ../client && npm ci
        cd game-client && npm ci
        cd ../profile-client && npm ci
    
    - name: Run ESLint
      run: |
        cd server && npm run lint
        cd ../client/game-client && npm run lint
        cd ../profile-client && npm run lint

  # Docker Build Test
  docker-build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: docker-compose build
    
    - name: Test Docker containers
      run: |
        docker-compose up -d
        sleep 30
        docker-compose ps
        docker-compose logs
        docker-compose down
```

### GitLab CI

**`.gitlab-ci.yml`**:
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  NODE_VERSION: "20"

# Backend Tests
backend:test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - server/node_modules/
  script:
    - cd server
    - npm ci
    - npm test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: server/coverage/cobertura-coverage.xml

# Profile API Tests
profile-api:test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - client/node_modules/
  script:
    - cd client
    - npm ci
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: client/coverage/cobertura-coverage.xml

# Frontend Tests
frontend:test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - client/game-client/node_modules/
  script:
    - cd client/game-client
    - npm ci
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: client/game-client/coverage/cobertura-coverage.xml

# E2E Tests
e2e:test:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  services:
    - docker:dind
  script:
    - npm ci
    - npx playwright install
    - docker-compose up -d
    - npx wait-on http://localhost:3000 --timeout 120000
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week

# Docker Build
docker:build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker-compose build
    - docker-compose push

# Deploy to staging
deploy:staging:
  stage: deploy
  only:
    - develop
  script:
    - echo "Deploy to staging"
    # Add your deployment script here

# Deploy to production
deploy:production:
  stage: deploy
  only:
    - main
  when: manual
  script:
    - echo "Deploy to production"
    # Add your deployment script here
```

---

## 📊 Code Coverage

### Setup Coverage Reporting

**`package.json`** (root):
```json
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd server && npm test",
    "test:frontend": "cd client/game-client && npm test",
    "test:e2e": "playwright test",
    "test:coverage": "npm run test:backend -- --coverage && npm run test:frontend -- --coverage",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

### Codecov Integration

**`codecov.yml`**:
```yaml
coverage:
  status:
    project:
      default:
        target: 70%
        threshold: 5%
    patch:
      default:
        target: 80%

flags:
  backend:
    paths:
      - server/
  profile-api:
    paths:
      - client/apiServer.js
  frontend:
    paths:
      - client/game-client/src/
  profile-client:
    paths:
      - client/profile-client/src/

ignore:
  - "**/__tests__/**"
  - "**/*.test.js"
  - "**/*.test.jsx"
  - "**/node_modules/**"
```

---

## ✅ Best Practices

### 1. **Test Naming Convention**
```javascript
describe('ComponentName or SystemName', () => {
  describe('methodName or feature', () => {
    it('should do something specific', () => {
      // Test
    })
  })
})
```

### 2. **Arrange-Act-Assert Pattern**
```javascript
it('should calculate damage correctly', () => {
  // Arrange
  const weapon = { baseDamage: 10, damageVariation: 5 }
  const player = { upgrades: { damageMultiplier: 2.0 } }
  
  // Act
  const damage = calculateDamage(weapon, player)
  
  // Assert
  expect(damage).toBeGreaterThanOrEqual(20)
})
```

### 3. **Mock External Dependencies**
```javascript
vi.mock('../api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mock' }))
}))
```

### 4. **Test Edge Cases**
```javascript
it('should handle zero health', () => {
  const enemy = { health: 0 }
  expect(isEnemyAlive(enemy)).toBe(false)
})

it('should handle negative damage', () => {
  const damage = -10
  expect(() => applyDamage(enemy, damage)).toThrow()
})
```

### 5. **Keep Tests Independent**
```javascript
beforeEach(() => {
  // Reset state before each test
  characterManager.characterData.clear()
})
```

### 6. **Use Test Data Factories**
```javascript
function createMockPlayer(overrides = {}) {
  return {
    id: 'player123',
    position: { x: 0, y: 0, z: 0 },
    health: 100,
    ...overrides
  }
}
```

### 7. **Test Real User Scenarios**
```javascript
test('player can complete dungeon flow', async ({ page }) => {
  // Login → Create party → Start dungeon → Kill enemies → Exit
})
```

---

## 🎯 Quick Start Checklist

- [ ] Install testing dependencies
- [ ] Configure Jest/Vitest
- [ ] Write first unit test
- [ ] Set up Playwright
- [ ] Write first E2E test
- [ ] Configure CI/CD pipeline
- [ ] Add coverage reporting
- [ ] Set coverage thresholds
- [ ] Document testing workflow
- [ ] Train team on testing

---

**Testing makes your game reliable! 🧪✨**

