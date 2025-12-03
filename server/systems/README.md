# Upgrade Systems Documentation

This directory contains modular upgrade systems for the dungeon crawler game. Each system is separated into its own file for easy modification and extension.

## File Structure

### `weaponDefinitions.js`
**Purpose**: Defines all weapon types and their base stats.

**What to modify**:
- Add new weapon types by adding entries to the `WEAPONS` object
- Adjust base stats for existing weapons
- Configure upgrade paths (increment amounts, max values)

**Example - Adding a new weapon**:
```javascript
poison: {
    type: 'poison',
    name: 'Poison Weapon',
    baseStats: {
        attackRadius: 2.0,
        attackCooldown: 900,
        baseDamage: 8,
        damageVariation: 4,
        maxTargets: 1
    },
    upgradePath: {
        radius: { increment: 0.5, max: 8.0 },
        damage: { increment: 4, max: 80 },
        cooldown: { increment: -45, min: 100 },
        maxTargets: { increment: 1, max: 8 }
    }
}
```

---

### `weaponSystem.js`
**Purpose**: Handles weapon stats, upgrades, and combat calculations.

**Key Functions**:
- `getWeaponStats(player)` - Get current weapon stats for a player
- `findEnemiesInRadius(player, room)` - Find enemies within attack range
- `calculateDamage(weaponStats)` - Calculate damage for an attack
- `upgradeWeapon(player, upgradeType, amount)` - Upgrade a weapon stat
- `changeWeapon(player, weaponType)` - Change player's weapon type
- `getWeaponStatsForDisplay(player)` - Get formatted stats for UI

**Upgrade Types**:
- `'radius'` - Increase attack radius
- `'damage'` - Increase base damage
- `'cooldown'` - Reduce attack cooldown (use negative amount)
- `'maxTargets'` or `'pierce'` - Increase number of enemies hit per attack

**Example Usage**:
```javascript
// Upgrade attack radius by 1.0
weaponSystem.upgradeWeapon(player, 'radius', 1.0)

// Increase max targets (piercing) by 1
weaponSystem.upgradeWeapon(player, 'maxTargets', 1)

// Reduce cooldown by 100ms
weaponSystem.upgradeWeapon(player, 'cooldown', 100)
```

---

### `characterUpgrades.js`
**Purpose**: Handles in-match character upgrades that reset when the match ends.

**Key Functions**:
- `initializeStats(player)` - Initialize default character stats
- `upgradeHealth(player, amount)` - Increase max health
- `upgradeMovementSpeed(player, multiplier)` - Increase movement speed
- `upgradeMana(player, amount)` - Increase max mana
- `upgradeDamageMultiplier(player, multiplier)` - Increase damage multiplier
- `upgradeAttackSpeed(player, multiplier)` - Increase attack speed
- `upgradeDefense(player, amount)` - Add defense points
- `addExperience(player, exp)` - Add experience and handle level ups
- `getCharacterStats(player)` - Get all character stats for display

**Character Stats**:
- `health` / `maxHealth` - Current and maximum health
- `mana` / `maxMana` - Current and maximum mana
- `movementSpeed` - Movement speed multiplier
- `damageMultiplier` - Global damage multiplier
- `attackSpeedMultiplier` - Attack speed multiplier
- `defense` - Defense points (reduces incoming damage)
- `level` - Current level
- `experience` / `experienceToNextLevel` - Experience tracking

**Example Usage**:
```javascript
// Increase health by 20
characterUpgrades.upgradeHealth(player, 20)

// Increase movement speed by 10%
characterUpgrades.upgradeMovementSpeed(player, 1.1)

// Add 50 experience
characterUpgrades.addExperience(player, 50)
```

---

### `accountUpgrades.js`
**Purpose**: Handles account-level persistent upgrades that apply across all matches.

**Key Functions**:
- `getAccountUpgrades(userId)` - Get account upgrade data (async, queries DB)
- `applyAccountUpgrades(player, accountUpgrades)` - Apply upgrades to player at match start
- `unlockWeapon(userId, weaponType)` - Unlock a weapon for an account
- `purchasePermanentUpgrade(userId, upgradeType, amount)` - Purchase permanent upgrade
- `getAvailableUpgrades(userId)` - Get available upgrades and costs

**Account Upgrade Types**:
- `defaultWeapon` - Starting weapon type
- `unlockedWeapons` - Array of unlocked weapon types
- `baseStatMultipliers` - Multipliers applied at match start
- `permanentUpgrades` - Permanent stat bonuses
- `unlockedAbilities` - Unlocked abilities/skills

**Database Integration**:
This file contains TODO comments where database queries should be added. Currently returns default values, but the structure is ready for database integration.

**Example - Database Integration**:
```javascript
async getAccountUpgrades(userId) {
    // Query database
    const result = await db.query(
        'SELECT * FROM account_upgrades WHERE user_id = ?',
        [userId]
    )
    
    return {
        userId: userId,
        defaultWeapon: result.default_weapon || 'basic',
        unlockedWeapons: JSON.parse(result.unlocked_weapons || '["basic"]'),
        // ... etc
    }
}
```

---

## Socket Event Handlers

All upgrade systems have corresponding socket event handlers in `gameServer.js`:

### Weapon System Events
- `getWeaponStats` - Get current weapon stats
- `upgradeWeapon` - Upgrade weapon (data: `{upgradeType, amount}`)
- `changeWeapon` - Change weapon type

### Character Upgrades Events
- `getCharacterStats` - Get current character stats
- `upgradeHealth` - Upgrade health (amount)
- `upgradeMovementSpeed` - Upgrade speed (multiplier)
- `upgradeDamageMultiplier` - Upgrade damage (multiplier)
- `addExperience` - Add experience (exp amount)

### Account Upgrades Events
- `getAccountUpgrades` - Get available account upgrades
- `purchaseAccountUpgrade` - Purchase upgrade (data: `{upgradeType, amount}`)
- `unlockWeapon` - Unlock weapon (weaponType)

---

## Adding New Features

### Adding a New Weapon Type
1. Open `weaponDefinitions.js`
2. Add new entry to `WEAPONS` object
3. Define base stats and upgrade paths
4. Done! The weapon system will automatically recognize it.

### Adding a New Character Upgrade
1. Open `characterUpgrades.js`
2. Add new upgrade function (e.g., `upgradeCriticalChance`)
3. Add corresponding socket handler in `gameServer.js`
4. Update `getCharacterStats` to include the new stat

### Adding a New Account Upgrade
1. Open `accountUpgrades.js`
2. Add upgrade logic to `purchasePermanentUpgrade`
3. Update `applyAccountUpgrades` to apply the upgrade
4. Add to `getAvailableUpgrades` for display
5. Add socket handler in `gameServer.js`

---

## Best Practices

1. **Keep it modular**: Each system should handle its own domain
2. **Document changes**: Add comments when adding new features
3. **Validate inputs**: Always check if player/user exists before upgrading
4. **Database ready**: Account upgrades should be structured for easy DB integration
5. **Balance**: Consider game balance when adjusting upgrade increments and max values

