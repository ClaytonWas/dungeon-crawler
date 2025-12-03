# 👤 Character System Guide

Complete guide to creating, editing, and upgrading characters in the game.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Character Creation](#character-creation)
- [Character Management](#character-management)
- [Progression System](#progression-system)
- [In-Match Upgrades](#in-match-upgrades)
- [Account Upgrades](#account-upgrades)
- [Testing](#testing)
- [Examples](#examples)

---

## 🎯 Overview

The character system supports **multiple persistent characters per account**:
- **Up to 5 characters** per user
- **Persistent progression** (level, XP, kills, deaths)
- **Visual customization** (shape, color)
- **Character switching** without page refresh
- **Primary character** selection

### Character Lifecycle

```
User Registers
    ↓
Default Character Created (shape + color from registration)
    ↓
User Can Create More Characters (up to 5 total)
    ↓
Select Character → Enters Hub World
    ↓
Join Dungeon → Gain XP/Level Up
    ↓
Character Stats Persist → Logout/Login
```

---

## ✨ Character Creation

### From Game Client

Characters are created in the **Account Tab** of the game client (port 5173).

**UI Flow**:
1. Click "Account" tab
2. Click "+ Create New Character"
3. Fill in:
   - **Name** (max 20 characters)
   - **Shape** (cube, sphere, cone)
   - **Color** (color picker)
4. Click "Create"

### Via Socket.IO

```javascript
// Emit create event
socket.emit('createCharacter', {
  name: 'My Warrior',
  shape: 'cube',          // 'cube' | 'sphere' | 'cone'
  color: '#ff0000'        // Hex color
})

// Listen for response
socket.on('characterCreated', (result) => {
  if (result.success) {
    console.log('Character created:', result.character)
  } else {
    console.error('Error:', result.message)
  }
})
```

### Character Limits

- **Maximum**: 5 characters per account
- **Minimum name length**: 1 character
- **Maximum name length**: 20 characters
- **Allowed shapes**: `'cube'`, `'sphere'`, `'cone'`
- **Color format**: Hex string `#RRGGBB`

---

## 🎮 Character Management

### Viewing Characters

```javascript
// Request character list
socket.emit('getMyCharacters')

// Receive character list
socket.on('myCharacters', ({ characters }) => {
  characters.forEach(char => {
    console.log(`${char.name} - Level ${char.level}`)
  })
})
```

### Selecting a Character

```javascript
// Select character to play
socket.emit('selectCharacter', characterId)

// Server updates your active character
// Visual appearance updates immediately
// Character enters hub world with selected appearance
```

**Effect**:
- Updates player mesh shape and color
- Loads character stats (level, XP, kills, deaths)
- Broadcasts appearance change to all players in area

### Setting Primary Character

```javascript
// Set as primary (auto-selected on login)
socket.emit('setPrimaryCharacter', characterId)

// Response
socket.on('primaryCharacterSet', ({ success, characterId }) => {
  console.log('Primary character updated')
})
```

**Effect**:
- Next login will auto-select this character
- Only one primary character per account

### Deleting a Character

```javascript
// Delete character
socket.emit('deleteCharacter', characterId)

// Response
socket.on('characterDeleted', ({ success, characterId }) => {
  if (success) {
    console.log('Character deleted')
  }
})
```

**Important**: Cannot delete your last character!

---

## 📈 Progression System

### Character Data Structure

```javascript
{
  id: 'user123_1702491234567_abc123',  // Unique ID
  userId: 123,                          // Owner account ID
  name: 'My Warrior',
  shape: 'cube',
  color: 0xff0000,                      // Stored as number
  level: 5,
  experience: 450,
  experienceToNextLevel: 550,
  totalKills: 87,
  totalDeaths: 3,
  createdAt: '2024-12-03T10:00:00Z',
  lastPlayed: '2024-12-03T12:30:00Z',
  isPrimary: true
}
```

### Experience System

**Gaining XP**:
```javascript
// When enemy dies (server-side)
const xpGained = enemy.maxHealth * 2  // Base formula

// Update character
characterManager.addExperience(characterId, xpGained)

// Broadcast to player
socket.emit('experienceGained', { 
  amount: xpGained,
  totalXP: character.experience,
  level: character.level
})
```

**Level Up Formula**:
```javascript
experienceToNextLevel = level * 100
```

**Examples**:
- Level 1 → 2: 100 XP
- Level 2 → 3: 200 XP
- Level 5 → 6: 500 XP
- Level 10 → 11: 1000 XP

### Stats Tracking

**Kills**:
```javascript
// Increment when enemy dies
characterManager.incrementKills(characterId)
```

**Deaths**:
```javascript
// Increment when player dies
characterManager.incrementDeaths(characterId)
```

**Last Played**:
```javascript
// Auto-updated when character is selected
character.lastPlayed = new Date().toISOString()
```

---

## 🔼 In-Match Upgrades (Temporary)

These upgrades apply only during the current dungeon run and reset when you leave.

**Location**: `server/systems/characterUpgrades.js`

### Available Upgrades

#### Upgrade Health

```javascript
// Add max health and restore to full
characterUpgrades.upgradeHealth(player, amount)

// Example: Add 20 max HP
characterUpgrades.upgradeHealth(player, 20)
```

**Effect**:
- Increases `player.maxHealth`
- Sets `player.health = player.maxHealth`

#### Upgrade Movement Speed

```javascript
// Multiply movement speed
characterUpgrades.upgradeMovementSpeed(player, multiplier)

// Example: +10% speed
characterUpgrades.upgradeMovementSpeed(player, 1.1)
```

**Effect**:
- Multiplies `player.upgrades.movementSpeed`
- Stacks multiplicatively: 1.1 * 1.1 = 1.21 (21% faster)

#### Upgrade Mana

```javascript
// Add max mana
characterUpgrades.upgradeMana(player, amount)

// Example: Add 30 mana
characterUpgrades.upgradeMana(player, 30)
```

**Effect**:
- Increases `player.maxMana`
- Restores `player.mana` to max

#### Upgrade Damage Multiplier

```javascript
// Multiply all damage
characterUpgrades.upgradeDamageMultiplier(player, multiplier)

// Example: +20% damage
characterUpgrades.upgradeDamageMultiplier(player, 1.2)
```

**Effect**:
- Multiplies `player.upgrades.damageMultiplier`
- Affects ALL weapon damage
- Stacks multiplicatively

#### Upgrade Attack Speed

```javascript
// Multiply attack speed (reduces cooldown)
characterUpgrades.upgradeAttackSpeed(player, multiplier)

// Example: +15% attack speed
characterUpgrades.upgradeAttackSpeed(player, 1.15)
```

**Effect**:
- Multiplies `player.upgrades.attackSpeed`
- Weapon cooldown divided by this value
- Example: 1000ms / 1.15 = 870ms cooldown

#### Upgrade Defense

```javascript
// Add flat defense points
characterUpgrades.upgradeDefense(player, amount)

// Example: Add 5 defense
characterUpgrades.upgradeDefense(player, 5)
```

**Effect**:
- Adds to `player.upgrades.defense`
- Damage taken: `Math.max(1, incomingDamage - defense)`

### Implementing Upgrade System

```javascript
// server/gameServer.js

socket.on('upgradeCharacterStat', ({ upgradeType, amount }) => {
  const player = players.get(socket.id)
  if (!player) return
  
  let result
  switch (upgradeType) {
    case 'health':
      result = characterUpgrades.upgradeHealth(player, amount)
      break
    case 'movementSpeed':
      result = characterUpgrades.upgradeMovementSpeed(player, amount)
      break
    case 'damage':
      result = characterUpgrades.upgradeDamageMultiplier(player, amount)
      break
    // ... etc
  }
  
  socket.emit('characterUpgradeApplied', result)
})
```

---

## 🏆 Account Upgrades (Permanent)

These upgrades persist across all characters and all sessions.

**Location**: `server/systems/accountUpgrades.js`

### Data Structure

```javascript
{
  userId: 123,
  defaultWeapon: 'basic',
  unlockedWeapons: ['basic', 'cone', 'aura'],
  baseStatMultipliers: {
    health: 1.2,      // +20% health on all characters
    damage: 1.15,     // +15% damage on all characters
    speed: 1.1        // +10% speed on all characters
  },
  specialAbilities: [
    'double_jump',
    'dash'
  ]
}
```

### Implementing Account Upgrades

```javascript
// Get account upgrades
const upgrades = accountUpgrades.getAccountUpgrades(userId)

// Apply to new player
player.maxHealth *= upgrades.baseStatMultipliers.health
player.upgrades.damageMultiplier *= upgrades.baseStatMultipliers.damage
player.upgrades.movementSpeed *= upgrades.baseStatMultipliers.speed

// Set default weapon
player.weapon = weaponSystem.initializeWeapon(upgrades.defaultWeapon)
```

### Unlocking Weapons

```javascript
// Unlock new weapon for account
accountUpgrades.unlockWeapon(userId, 'lightning_bolt')

// Check if weapon is unlocked
if (accountUpgrades.hasWeapon(userId, 'lightning_bolt')) {
  // Allow switching to this weapon
}
```

---

## 🧪 Testing

### Create Multiple Characters

```javascript
// In browser console
const shapes = ['cube', 'sphere', 'cone']
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00']

for (let i = 0; i < 5; i++) {
  socket.emit('createCharacter', {
    name: `Character ${i + 1}`,
    shape: shapes[i % 3],
    color: colors[i]
  })
}
```

### Test Character Switching

```javascript
// Get character list
socket.emit('getMyCharacters')

// In the response handler, save character IDs:
let characterIds = []
socket.on('myCharacters', ({ characters }) => {
  characterIds = characters.map(c => c.id)
})

// Switch between characters
characterIds.forEach((id, index) => {
  setTimeout(() => {
    socket.emit('selectCharacter', id)
    console.log(`Switched to character ${index + 1}`)
  }, index * 2000)  // 2 seconds apart
})
```

### Test XP Gain

```javascript
// Add XP directly (requires server-side code access)
characterManager.addExperience(characterId, 500)

// Verify level up
socket.on('levelUp', ({ newLevel, character }) => {
  console.log(`Level up! Now level ${newLevel}`)
})
```

### Test Upgrades

```javascript
// Test in-match upgrades
socket.emit('upgradeCharacterStat', { upgradeType: 'health', amount: 50 })
socket.emit('upgradeCharacterStat', { upgradeType: 'damage', amount: 1.5 })
socket.emit('upgradeCharacterStat', { upgradeType: 'movementSpeed', amount: 1.2 })

// Check current stats
socket.emit('getPlayerStats')
```

---

## 📝 Examples

### Tank Build

**In-Match Upgrades**:
```javascript
// Max health
characterUpgrades.upgradeHealth(player, 100)
characterUpgrades.upgradeHealth(player, 100)

// Max defense
characterUpgrades.upgradeDefense(player, 20)
characterUpgrades.upgradeDefense(player, 20)

// Some damage
characterUpgrades.upgradeDamageMultiplier(player, 1.3)
```

**Result**: 300 HP, 40 Defense, 30% more damage

---

### DPS Build

**In-Match Upgrades**:
```javascript
// Max damage
characterUpgrades.upgradeDamageMultiplier(player, 1.5)
characterUpgrades.upgradeDamageMultiplier(player, 1.5)
// Total: 1.5 * 1.5 = 2.25x damage

// Max attack speed
characterUpgrades.upgradeAttackSpeed(player, 1.3)
characterUpgrades.upgradeAttackSpeed(player, 1.3)
// Total: 1.3 * 1.3 = 1.69x attack speed
```

**Result**: 2.25x damage, 1.69x attack speed = ~3.8x DPS

---

### Speedrunner Build

**In-Match Upgrades**:
```javascript
// Max movement speed
characterUpgrades.upgradeMovementSpeed(player, 1.2)
characterUpgrades.upgradeMovementSpeed(player, 1.2)
characterUpgrades.upgradeMovementSpeed(player, 1.2)
// Total: 1.2³ = 1.728x speed (72.8% faster)

// Some damage
characterUpgrades.upgradeDamageMultiplier(player, 1.5)
```

**Result**: 72.8% faster movement, 50% more damage

---

## 🎨 Customization

### Shape Options

| Shape | Description | Hit Box | Visual |
|-------|-------------|---------|--------|
| **cube** | Box | Rectangular | Sharp edges |
| **sphere** | Ball | Circular | Smooth |
| **cone** | Pyramid | Triangular | Pointed |

### Color Guidelines

**Good Colors** (High visibility):
- Bright colors: `#ff0000`, `#00ff00`, `#0000ff`
- Saturated: `#ff00ff`, `#ffff00`, `#00ffff`

**Avoid**:
- Very dark: `#0a0a0a` (hard to see)
- Gray/brown: `#808080`, `#8b4513` (blends in)

---

## 🐛 Troubleshooting

### Character Not Appearing

**Check**:
1. Character selected: `socket.emit('selectCharacter', id)`
2. In correct area (hub vs. dungeon)
3. Position is valid: `y > 0`

### Appearance Not Updating

**Issue**: Other players see old appearance  
**Solution**: Appearance updates broadcast via MMO-style sync
- Changes should be instant for all players in same area
- If not, check server-side broadcast logic

### Can't Create More Characters

**Issue**: "Maximum characters reached"  
**Solution**: Delete a character first (max 5 per account)

### Stats Not Persisting

**Issue**: Stats reset after logout  
**Solution**:
- Character stats are saved to `characterData` Map
- Need database persistence for production (SQLite/PostgreSQL)

---

## 📚 Code Reference

### Files

- **Character Manager**: `server/systems/characterManager.js`
- **In-Match Upgrades**: `server/systems/characterUpgrades.js`
- **Account Upgrades**: `server/systems/accountUpgrades.js`
- **Server Logic**: `server/gameServer.js`
- **Client UI**: `client/game-client/src/components/tabs/AccountTab.jsx`

### Key Functions

```javascript
// Character CRUD
characterManager.createCharacter(userId, data)
characterManager.getCharacters(userId)
characterManager.getCharacter(characterId)
characterManager.deleteCharacter(userId, characterId)
characterManager.updateCharacter(characterId, updates)

// Progression
characterManager.addExperience(characterId, amount)
characterManager.incrementKills(characterId)
characterManager.incrementDeaths(characterId)

// In-match upgrades
characterUpgrades.upgradeHealth(player, amount)
characterUpgrades.upgradeDamageMultiplier(player, multiplier)
characterUpgrades.upgradeMovementSpeed(player, multiplier)

// Account upgrades
accountUpgrades.getAccountUpgrades(userId)
accountUpgrades.unlockWeapon(userId, weaponType)
accountUpgrades.upgradeBaseStat(userId, stat, multiplier)
```

---

## 🎯 Design Philosophy

### Multiple Characters

**Why**: Allows players to experiment with different builds and playstyles without losing progress on their main character.

**Balance**:
- Limited to 5 characters (prevents account bloat)
- Each character has independent progression
- Account upgrades benefit all characters

### Persistent Progression

**Why**: Creates long-term goals and investment in characters.

**Implementation**:
- Level, XP, kills, deaths saved
- Survives logout/login
- Eventually migrate to database

### Temporary vs. Permanent Upgrades

**In-Match** (Temporary):
- Apply during dungeon run
- Reset on exit
- Allow experimentation
- Vampire Survivors-style

**Account** (Permanent):
- Persist forever
- Apply to all characters
- Unlock via progression
- RPG-style

---

**Happy Character Building!** 👤✨

