/**
 * WEAPON SYSTEM
 * 
 * Handles weapon stats, upgrades, and combat calculations.
 * Works with weaponDefinitions.js for weapon types.
 */

const { getWeaponDefinition } = require('./weaponDefinitions')

class WeaponSystem {
    /**
     * Get current weapon stats for a player
     * @param {Object} player - Player object from playersInServer
     * @returns {Object} Weapon stats
     */
    getWeaponStats(player) {
        if (!player) return null
        
        const weaponDef = getWeaponDefinition(player.weaponType || 'basic')
        
        return {
            type: player.weaponType || 'basic',
            attackRadius: player.attackRadius ?? weaponDef.baseStats.attackRadius,
            attackCooldown: player.attackCooldown ?? weaponDef.baseStats.attackCooldown,
            baseDamage: player.baseDamage ?? weaponDef.baseStats.baseDamage,
            damageVariation: player.damageVariation ?? weaponDef.baseStats.damageVariation,
            maxTargets: player.maxTargets ?? weaponDef.baseStats.maxTargets,
            lastAttackTime: player.lastAttackTime || 0
        }
    }
    
    /**
     * Find enemies within attack radius, limited by maxTargets
     * @param {Object} player - Player object
     * @param {Object} room - Room object with enemies array
     * @returns {Array} Array of {enemy, distance} objects, sorted by distance
     */
    findEnemiesInRadius(player, room) {
        if (!player || !player.position || !room || !room.enemies) return []
        
        const weaponStats = this.getWeaponStats(player)
        if (!weaponStats) return []
        
        const playerPos = player.position
        const enemiesInRange = []
        
        room.enemies.forEach(enemy => {
            if (enemy.health <= 0) return
            
            const distance = Math.sqrt(
                Math.pow(enemy.position.x - playerPos.x, 2) +
                Math.pow(enemy.position.z - playerPos.z, 2)
            )
            
            if (distance <= weaponStats.attackRadius) {
                enemiesInRange.push({
                    enemy: enemy,
                    distance: distance
                })
            }
        })
        
        // Sort by distance (closest first) and limit by maxTargets
        const sorted = enemiesInRange.sort((a, b) => a.distance - b.distance)
        return sorted.slice(0, weaponStats.maxTargets)
    }
    
    /**
     * Calculate damage for a weapon
     * @param {Object} weaponStats - Weapon stats object
     * @returns {Number} Damage amount
     */
    calculateDamage(weaponStats) {
        return weaponStats.baseDamage + Math.floor(Math.random() * weaponStats.damageVariation)
    }
    
    /**
     * Upgrade a weapon stat
     * @param {Object} player - Player object to upgrade
     * @param {String} upgradeType - 'radius', 'damage', 'cooldown', 'maxTargets'
     * @param {Number} amount - Amount to upgrade (can be negative for cooldown reduction)
     * @returns {Boolean} Success status
     */
    upgradeWeapon(player, upgradeType, amount) {
        if (!player) return false
        
        const weaponDef = getWeaponDefinition(player.weaponType || 'basic')
        const upgradePath = weaponDef.upgradePath[upgradeType]
        
        if (!upgradePath) return false
        
        switch(upgradeType) {
            case 'radius':
                const newRadius = (player.attackRadius ?? weaponDef.baseStats.attackRadius) + amount
                player.attackRadius = Math.min(newRadius, upgradePath.max)
                return true
                
            case 'damage':
                const newDamage = (player.baseDamage ?? weaponDef.baseStats.baseDamage) + amount
                player.baseDamage = Math.min(newDamage, upgradePath.max)
                return true
                
            case 'cooldown':
                // Cooldown reduction (negative amount)
                const currentCooldown = player.attackCooldown ?? weaponDef.baseStats.attackCooldown
                const newCooldown = Math.max(currentCooldown - amount, upgradePath.min)
                player.attackCooldown = newCooldown
                return true
                
            case 'pierce':
            case 'maxTargets':
                const newMaxTargets = (player.maxTargets ?? weaponDef.baseStats.maxTargets) + amount
                player.maxTargets = Math.min(newMaxTargets, upgradePath.max)
                return true
                
            default:
                return false
        }
    }
    
    /**
     * Change player's weapon type
     * @param {Object} player - Player object
     * @param {String} weaponType - New weapon type
     * @returns {Boolean} Success status
     */
    changeWeapon(player, weaponType) {
        if (!player) return false
        
        const weaponDef = getWeaponDefinition(weaponType)
        if (!weaponDef) return false
        
        // Set weapon type
        player.weaponType = weaponType
        
        // Reset to base stats (or keep upgrades - you decide)
        // Option 1: Reset to base (uncomment these)
        // player.attackRadius = weaponDef.baseStats.attackRadius
        // player.attackCooldown = weaponDef.baseStats.attackCooldown
        // player.baseDamage = weaponDef.baseStats.baseDamage
        // player.maxTargets = weaponDef.baseStats.maxTargets
        
        // Option 2: Keep current upgrades (current implementation)
        // Just update weaponType, stats stay the same
        
        return true
    }
    
    /**
     * Get weapon stats formatted for display/UI
     * @param {Object} player - Player object
     * @returns {Object} Formatted stats
     */
    getWeaponStatsForDisplay(player) {
        const stats = this.getWeaponStats(player)
        if (!stats) return null
        
        const weaponDef = getWeaponDefinition(stats.type)
        
        return {
            type: stats.type,
            name: weaponDef.name,
            attackRadius: stats.attackRadius.toFixed(1),
            attackCooldown: stats.attackCooldown,
            baseDamage: stats.baseDamage,
            maxTargets: stats.maxTargets,
            // Include upgrade info
            upgradePath: weaponDef.upgradePath
        }
    }
}

module.exports = new WeaponSystem()

