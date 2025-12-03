# ⚔️ Weapon System Guide

Complete guide to creating, editing, and upgrading weapons in the game.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Creating a New Weapon](#creating-a-new-weapon)
- [Weapon Properties](#weapon-properties)
- [Upgrade System](#upgrade-system)
- [Testing Weapons](#testing-weapons)
- [Balance Guide](#balance-guide)
- [Examples](#examples)

---

## 🎯 Overview

The weapon system is built for **Vampire Survivors-style combat**:
- **Auto-attack**: Server automatically attacks enemies in range
- **Radius targeting**: Attacks all enemies within a circle or cone
- **Piercing**: Hit multiple enemies with one attack
- **Upgradeable**: Players can upgrade damage, radius, cooldown, and pierce

### How It Works

```
Server Combat Loop (every 100ms)
    ↓
Check if weapon cooldown elapsed
    ↓
Find enemies within attackRadius
    ↓
Select up to maxTargets enemies
    ↓
Calculate damage: (baseDamage + random(0, damageVariation)) * damageMultiplier
    ↓
Apply damage to all targeted enemies
    ↓
Broadcast 'playerAttacked' event to all clients
    ↓
Clients display:
  - Damage numbers above enemies
  - Yellow bounding boxes on targeted enemies
  - Red attack radius ring around player
```

---

## 🛠️ Creating a New Weapon

### Step 1: Define in `weaponDefinitions.js`

```javascript
// server/systems/weaponDefinitions.js

module.exports = {
  // ... existing weapons ...
  
  myWeapon: {
    type: 'myWeapon',
    name: 'My Awesome Weapon',
    baseStats: {
      attackRadius: 5.0,           // Range in game units
      attackCooldown: 1000,        // Milliseconds between attacks
      baseDamage: 20,              // Base damage per hit
      damageVariation: 5,          // Random damage: baseDamage ± damageVariation
      maxTargets: 2,               // Number of enemies hit per attack (piercing)
      attackShape: 'circle'        // 'circle' or 'cone'
    },
    upgradePath: {
      radius: {
        increment: 0.5,            // How much radius increases per upgrade
        max: 12.0                  // Maximum radius
      },
      damage: {
        increment: 5,              // Damage increase per upgrade
        max: 150                   // Maximum damage
      },
      cooldown: {
        increment: -50,            // Cooldown decrease per upgrade (negative!)
        min: 300                   // Minimum cooldown (fastest attack)
      },
      maxTargets: {
        increment: 1,              // Pierce increase per upgrade
        max: 8                     // Maximum targets
      }
    }
  }
}
```

### Step 2: Test in Game

```javascript
// In browser console while in game:
socket.emit('changeWeapon', 'myWeapon')

// Check stats:
socket.emit('getWeaponStats')
```

### Step 3: Balance and Iterate

- Test against enemies
- Adjust damage/cooldown
- Fine-tune radius and pierce
- Update `upgradePath` limits

---

## 📊 Weapon Properties

### Base Stats

#### `attackRadius`
- **What**: Distance from player that enemies can be targeted
- **Range**: 3.0 - 15.0 typical
- **Tips**:
  - Short range (3-5): High damage melee
  - Medium range (5-8): Balanced
  - Long range (8-15): Lower damage ranged

#### `attackCooldown`
- **What**: Milliseconds between attacks
- **Range**: 300 - 2000 typical
- **Tips**:
  - Fast (300-600ms): Low damage per hit
  - Medium (600-1200ms): Balanced
  - Slow (1200-2000ms): High damage per hit

#### `baseDamage`
- **What**: Base damage before variation and multipliers
- **Range**: 5 - 50 typical
- **Tips**:
  - Low damage (5-15): Fast weapons
  - Medium damage (15-30): Balanced
  - High damage (30-50+): Slow weapons

#### `damageVariation`
- **What**: Random damage range
- **Formula**: `damage = baseDamage + random(0, damageVariation)`
- **Range**: 2 - 10 typical
- **Tips**:
  - Low variation (2-3): Consistent damage
  - High variation (8-10): More randomness

#### `maxTargets`
- **What**: Number of enemies hit per attack (piercing)
- **Range**: 1 - 10 typical
- **Tips**:
  - Single target (1): Boss killer
  - Few targets (2-3): Balanced
  - Many targets (5-10): AoE/crowd control

#### `attackShape`
- **What**: Shape of attack area
- **Options**: `'circle'` or `'cone'`
- **Tips**:
  - `circle`: 360° attack (easier to use)
  - `cone`: Directional attack (requires aim)

---

### Upgrade Path

#### `radius`
```javascript
radius: {
  increment: 0.5,    // Amount added per upgrade
  max: 12.0          // Maximum value
}
```

**Balance**: 
- Smaller increment (0.3-0.5): Gradual growth
- Larger increment (0.8-1.0): Fast growth

#### `damage`
```javascript
damage: {
  increment: 5,      // Amount added per upgrade
  max: 150           // Maximum value
}
```

**Balance**:
- Start with `baseDamage` * 2-3 for max
- Increment should be 10-20% of base

#### `cooldown`
```javascript
cooldown: {
  increment: -50,    // NEGATIVE: Reduces cooldown
  min: 300           // Minimum (fastest attack)
}
```

**Balance**:
- Never go below 300ms (server runs at 100ms)
- Increment should be 5-10% of base cooldown

#### `maxTargets`
```javascript
maxTargets: {
  increment: 1,      // Usually 1 per upgrade
  max: 8             // Maximum pierce
}
```

**Balance**:
- Cap at 5-10 targets
- Single-target weapons shouldn't exceed 3-4

---

## 🔼 Upgrade System

### How Upgrades Work

```javascript
// Client requests upgrade
socket.emit('upgradeWeapon', {
  upgradeType: 'damage',  // 'radius' | 'damage' | 'cooldown' | 'maxTargets'
  amount: 1               // Number of upgrade levels
})

// Server processes
const weapon = weaponSystem.upgradeWeapon(player.weapon, 'damage', 1)

// Server broadcasts new stats
socket.emit('weaponStatsUpdate', weapon)
```

### Upgrade Types

| Type | Effect | Visual Feedback |
|------|--------|-----------------|
| `radius` | Increases attack range | Red ring gets bigger |
| `damage` | Increases damage per hit | Damage numbers increase |
| `cooldown` | Attacks more frequently | Faster bounding box flashes |
| `maxTargets` | Hits more enemies | More yellow boxes |

### Testing Upgrades

```javascript
// In browser console:

// Upgrade damage 5 times
for (let i = 0; i < 5; i++) {
  socket.emit('upgradeWeapon', { upgradeType: 'damage', amount: 1 })
}

// Max out all stats
socket.emit('upgradeWeapon', { upgradeType: 'radius', amount: 100 })
socket.emit('upgradeWeapon', { upgradeType: 'damage', amount: 100 })
socket.emit('upgradeWeapon', { upgradeType: 'cooldown', amount: 100 })
socket.emit('upgradeWeapon', { upgradeType: 'maxTargets', amount: 100 })
```

---

## ⚖️ Balance Guide

### DPS Calculation

```
DPS = (baseDamage + (damageVariation / 2)) / (attackCooldown / 1000) * maxTargets
```

**Example**:
```
baseDamage: 20
damageVariation: 5
attackCooldown: 1000ms
maxTargets: 2

DPS = (20 + 2.5) / 1.0 * 2 = 45 DPS
```

### Balance Targets

| Weapon Type | DPS | Radius | Cooldown | Targets |
|-------------|-----|--------|----------|---------|
| **Fast Melee** | 30-40 | 3-4 | 400-600 | 1-2 |
| **Balanced** | 40-50 | 5-7 | 800-1200 | 2-3 |
| **Slow Power** | 35-45 | 4-6 | 1500-2000 | 1-2 |
| **AoE Ranged** | 50-70 | 8-12 | 1000-1500 | 4-6 |

### Upgrade Progression

**Early Game** (Levels 1-5):
- Focus on one stat
- Small, noticeable improvements
- 10-20% DPS increase per upgrade

**Mid Game** (Levels 6-15):
- Diversify upgrades
- 5-10% DPS increase per upgrade

**Late Game** (Levels 16+):
- Diminishing returns
- Max caps prevent over-scaling
- Focus on playstyle preferences

---

## 📝 Examples

### Fast Daggers

```javascript
daggers: {
  type: 'daggers',
  name: 'Twin Daggers',
  baseStats: {
    attackRadius: 3.5,
    attackCooldown: 400,     // Very fast
    baseDamage: 8,           // Low damage
    damageVariation: 2,
    maxTargets: 1,           // Single target
    attackShape: 'circle'
  },
  upgradePath: {
    radius: { increment: 0.3, max: 6.0 },
    damage: { increment: 3, max: 50 },
    cooldown: { increment: -30, min: 200 },
    maxTargets: { increment: 1, max: 3 }
  }
}
```

**Playstyle**: Fast, close-range, single-target DPS

---

### Heavy Hammer

```javascript
hammer: {
  type: 'hammer',
  name: 'War Hammer',
  baseStats: {
    attackRadius: 4.0,
    attackCooldown: 1800,    // Very slow
    baseDamage: 45,          // High damage
    damageVariation: 10,     // High variation
    maxTargets: 2,
    attackShape: 'circle'
  },
  upgradePath: {
    radius: { increment: 0.4, max: 8.0 },
    damage: { increment: 10, max: 200 },
    cooldown: { increment: -100, min: 600 },
    maxTargets: { increment: 1, max: 4 }
  }
}
```

**Playstyle**: Slow, heavy hits, good AoE

---

### Magic Projectile

```javascript
magic_bolt: {
  type: 'magic_bolt',
  name: 'Arcane Bolt',
  baseStats: {
    attackRadius: 10.0,      // Long range
    attackCooldown: 1000,
    baseDamage: 18,
    damageVariation: 4,
    maxTargets: 3,
    attackShape: 'cone'      // Directional
  },
  upgradePath: {
    radius: { increment: 0.8, max: 20.0 },
    damage: { increment: 5, max: 120 },
    cooldown: { increment: -60, min: 400 },
    maxTargets: { increment: 1, max: 6 }
  }
}
```

**Playstyle**: Long-range, directional, medium pierce

---

### AoE Aura

```javascript
aura: {
  type: 'aura',
  name: 'Death Aura',
  baseStats: {
    attackRadius: 6.0,
    attackCooldown: 800,
    baseDamage: 12,          // Lower damage
    damageVariation: 3,
    maxTargets: 8,           // High pierce!
    attackShape: 'circle'
  },
  upgradePath: {
    radius: { increment: 0.6, max: 15.0 },
    damage: { increment: 4, max: 80 },
    cooldown: { increment: -50, min: 300 },
    maxTargets: { increment: 2, max: 15 }
  }
}
```

**Playstyle**: Crowd control, constant AoE damage

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Weapon loads without errors
- [ ] Auto-attack triggers correctly
- [ ] Damage is applied to enemies
- [ ] Attack radius displays correctly
- [ ] Cooldown works as expected

### Visual Feedback
- [ ] Red attack radius ring visible
- [ ] Yellow bounding boxes on targeted enemies
- [ ] Damage numbers appear above enemies
- [ ] Damage numbers match expected range

### Upgrades
- [ ] Each upgrade type works
- [ ] Stats increase correctly
- [ ] Maxcaps work
- [ ] Upgraded stats persist

### Balance
- [ ] DPS feels appropriate
- [ ] Weapon has clear strengths/weaknesses
- [ ] Upgrades provide meaningful improvements
- [ ] Max level weapon isn't overpowered

---

## 🐛 Troubleshooting

### Weapon Not Attacking

**Check**:
1. `attackCooldown` > 100 (server loop runs at 100ms)
2. Enemies exist in dungeon
3. Player is in dungeon (not hub world)
4. `attackRadius` > 0

### Visual Indicators Missing

**Check**:
1. Attack radius: `attackRadiusRef` is set in `GameCanvas.jsx`
2. Bounding boxes: `enemyBoundingBoxesRef` is populated
3. Damage numbers: `damageNumbers` array in game store

### Damage Seems Wrong

**Formula**:
```javascript
damage = (baseDamage + Math.random() * damageVariation) * player.upgrades.damageMultiplier
```

**Example**:
- `baseDamage: 20`
- `damageVariation: 5`
- `damageMultiplier: 1.5`
- Damage range: `20 * 1.5 = 30` to `25 * 1.5 = 37.5`

---

## 📚 Code Reference

### Files

- **Definitions**: `server/systems/weaponDefinitions.js`
- **Logic**: `server/systems/weaponSystem.js`
- **Server**: `server/gameServer.js` (combat loop)
- **Client**: `client/game-client/src/components/GameCanvas.jsx`

### Key Functions

```javascript
// Initialize weapon
weaponSystem.initializeWeapon(weaponType)

// Upgrade weapon
weaponSystem.upgradeWeapon(weapon, upgradeType, amount)

// Calculate damage
weaponSystem.calculateDamage(weapon, player)

// Find targets
weaponSystem.findTargets(player, enemies, weaponStats)
```

---

## 🎓 Design Philosophy

### Vampire Survivors Inspired

1. **Auto-attack**: No manual attacking
2. **Passive scaling**: Upgrades are permanent in match
3. **Build variety**: Different weapons, different playstyles
4. **Visual clarity**: Always show attack range and targets

### Balance Goals

1. **No strict meta**: All weapons viable
2. **Playstyle diversity**: Different weapons feel different
3. **Upgrade satisfaction**: Each upgrade feels impactful
4. **Late-game scaling**: Caps prevent runaway power

---

**Happy Weapon Crafting!** ⚔️✨

