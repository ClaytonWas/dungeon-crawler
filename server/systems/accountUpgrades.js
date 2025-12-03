/**
 * ACCOUNT UPGRADES (PERSISTENT)
 * 
 * Handles account-level upgrades that persist across matches.
 * These are stored in the database and apply to all matches.
 * 
 * Examples: Starting weapon, base stats, unlocked weapons, etc.
 */

// This would typically interact with a database
// For now, we'll use a simple structure that can be easily connected to a DB

class AccountUpgrades {
    /**
     * Get account upgrades for a user
     * In a real implementation, this would query the database
     * @param {Number} userId - User ID
     * @returns {Object} Account upgrade data
     */
    async getAccountUpgrades(userId) {
        // TODO: Query database for user upgrades
        // For now, return default structure
        
        return {
            userId: userId,
            // Starting weapon type
            defaultWeapon: 'basic',
            
            // Unlocked weapons
            unlockedWeapons: ['basic'],
            
            // Base stat multipliers (applied at match start)
            baseStatMultipliers: {
                health: 1.0,
                damage: 1.0,
                speed: 1.0,
                attackRadius: 1.0
            },
            
            // Permanent upgrades
            permanentUpgrades: {
                maxHealthBonus: 0,
                baseDamageBonus: 0,
                movementSpeedBonus: 0,
                attackRadiusBonus: 0
            },
            
            // Unlocked abilities/skills
            unlockedAbilities: []
        }
    }
    
    /**
     * Apply account upgrades to a player at match start
     * @param {Object} player - Player object
     * @param {Object} accountUpgrades - Account upgrade data
     */
    applyAccountUpgrades(player, accountUpgrades) {
        if (!player || !accountUpgrades) return
        
        // Set default weapon
        if (accountUpgrades.defaultWeapon) {
            player.weaponType = accountUpgrades.defaultWeapon
        }
        
        // Apply base stat multipliers
        const multipliers = accountUpgrades.baseStatMultipliers || {}
        
        if (multipliers.health) {
            player.maxHealth = Math.floor((player.maxHealth ?? 100) * multipliers.health)
            player.health = player.maxHealth
        }
        
        if (multipliers.damage) {
            player.baseDamage = Math.floor((player.baseDamage ?? 10) * multipliers.damage)
        }
        
        if (multipliers.speed) {
            player.movementSpeed = (player.movementSpeed ?? 1.0) * multipliers.speed
        }
        
        if (multipliers.attackRadius) {
            player.attackRadius = (player.attackRadius ?? 3.0) * multipliers.attackRadius
        }
        
        // Apply permanent bonuses
        const permanent = accountUpgrades.permanentUpgrades || {}
        
        if (permanent.maxHealthBonus) {
            player.maxHealth = (player.maxHealth ?? 100) + permanent.maxHealthBonus
            player.health = player.maxHealth
        }
        
        if (permanent.baseDamageBonus) {
            player.baseDamage = (player.baseDamage ?? 10) + permanent.baseDamageBonus
        }
        
        if (permanent.movementSpeedBonus) {
            player.movementSpeed = (player.movementSpeed ?? 1.0) + permanent.movementSpeedBonus
        }
        
        if (permanent.attackRadiusBonus) {
            player.attackRadius = (player.attackRadius ?? 3.0) + permanent.attackRadiusBonus
        }
    }
    
    /**
     * Unlock a weapon for an account
     * @param {Number} userId - User ID
     * @param {String} weaponType - Weapon type to unlock
     * @returns {Boolean} Success status
     */
    async unlockWeapon(userId, weaponType) {
        // TODO: Update database to unlock weapon
        // For now, just return success
        return true
    }
    
    /**
     * Purchase a permanent upgrade
     * @param {Number} userId - User ID
     * @param {String} upgradeType - Type of upgrade
     * @param {Number} amount - Amount/level of upgrade
     * @returns {Boolean} Success status
     */
    async purchasePermanentUpgrade(userId, upgradeType, amount) {
        // TODO: Update database with permanent upgrade
        // Check if user has enough currency
        // Apply upgrade
        return true
    }
    
    /**
     * Get available upgrades for display
     * @param {Number} userId - User ID
     * @returns {Object} Available upgrades and costs
     */
    async getAvailableUpgrades(userId) {
        // TODO: Query database for available upgrades
        return {
            weaponUnlocks: [
                { type: 'fire', name: 'Fire Weapon', cost: 1000, unlocked: false },
                { type: 'ice', name: 'Ice Weapon', cost: 1500, unlocked: false },
                { type: 'lightning', name: 'Lightning Weapon', cost: 2000, unlocked: false }
            ],
            permanentUpgrades: [
                { type: 'maxHealthBonus', name: 'Max Health +10', cost: 500, currentLevel: 0, maxLevel: 10 },
                { type: 'baseDamageBonus', name: 'Base Damage +2', cost: 300, currentLevel: 0, maxLevel: 20 },
                { type: 'movementSpeedBonus', name: 'Movement Speed +0.1', cost: 400, currentLevel: 0, maxLevel: 5 },
                { type: 'attackRadiusBonus', name: 'Attack Radius +0.5', cost: 600, currentLevel: 0, maxLevel: 5 }
            ]
        }
    }
}

module.exports = new AccountUpgrades()

