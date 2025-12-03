/**
 * CHARACTER UPGRADES (IN-MATCH)
 * 
 * Handles character upgrades that apply during a single match/session.
 * These upgrades reset when the match ends.
 * 
 * Examples: Health boosts, movement speed, mana, etc.
 */

class CharacterUpgrades {
    /**
     * Initialize default character stats
     * @param {Object} player - Player object
     */
    initializeStats(player) {
        if (!player) return
        
        // Base stats
        player.health = player.health ?? 100
        player.maxHealth = player.maxHealth ?? 100
        player.mana = player.mana ?? 50
        player.maxMana = player.maxMana ?? 50
        player.movementSpeed = player.movementSpeed ?? 1.0
        
        // Combat stats (weapon system handles these)
        // But we can add character-specific combat modifiers
        player.damageMultiplier = player.damageMultiplier ?? 1.0
        player.attackSpeedMultiplier = player.attackSpeedMultiplier ?? 1.0
        player.defense = player.defense ?? 0
        
        // Experience and level (for in-match progression)
        player.level = player.level ?? 1
        player.experience = player.experience ?? 0
        player.experienceToNextLevel = player.experienceToNextLevel ?? 100
    }
    
    /**
     * Upgrade character health
     * @param {Object} player - Player object
     * @param {Number} amount - Amount to increase max health
     * @returns {Boolean} Success status
     */
    upgradeHealth(player, amount) {
        if (!player) return false
        
        const currentMaxHealth = player.maxHealth ?? 100
        player.maxHealth = currentMaxHealth + amount
        player.health = Math.min(player.health + amount, player.maxHealth) // Heal when upgrading
        return true
    }
    
    /**
     * Upgrade movement speed
     * @param {Object} player - Player object
     * @param {Number} multiplier - Speed multiplier (e.g., 1.1 for 10% increase)
     * @returns {Boolean} Success status
     */
    upgradeMovementSpeed(player, multiplier) {
        if (!player) return false
        
        const currentSpeed = player.movementSpeed ?? 1.0
        player.movementSpeed = currentSpeed * multiplier
        return true
    }
    
    /**
     * Upgrade mana
     * @param {Object} player - Player object
     * @param {Number} amount - Amount to increase max mana
     * @returns {Boolean} Success status
     */
    upgradeMana(player, amount) {
        if (!player) return false
        
        const currentMaxMana = player.maxMana ?? 50
        player.maxMana = currentMaxMana + amount
        player.mana = Math.min(player.mana + amount, player.maxMana)
        return true
    }
    
    /**
     * Upgrade damage multiplier
     * @param {Object} player - Player object
     * @param {Number} multiplier - Damage multiplier (e.g., 1.2 for 20% increase)
     * @returns {Boolean} Success status
     */
    upgradeDamageMultiplier(player, multiplier) {
        if (!player) return false
        
        const currentMultiplier = player.damageMultiplier ?? 1.0
        player.damageMultiplier = currentMultiplier * multiplier
        return true
    }
    
    /**
     * Upgrade attack speed multiplier
     * @param {Object} player - Player object
     * @param {Number} multiplier - Attack speed multiplier
     * @returns {Boolean} Success status
     */
    upgradeAttackSpeed(player, multiplier) {
        if (!player) return false
        
        const currentMultiplier = player.attackSpeedMultiplier ?? 1.0
        player.attackSpeedMultiplier = currentMultiplier * multiplier
        
        // Apply to attack cooldown
        const baseCooldown = player.attackCooldown ?? 1000
        player.attackCooldown = baseCooldown / player.attackSpeedMultiplier
        return true
    }
    
    /**
     * Upgrade defense
     * @param {Object} player - Player object
     * @param {Number} amount - Defense points to add
     * @returns {Boolean} Success status
     */
    upgradeDefense(player, amount) {
        if (!player) return false
        
        const currentDefense = player.defense ?? 0
        player.defense = currentDefense + amount
        return true
    }
    
    /**
     * Add experience and handle level ups
     * @param {Object} player - Player object
     * @param {Number} exp - Experience to add
     * @returns {Object} Level up info { leveledUp: boolean, newLevel: number }
     */
    addExperience(player, exp) {
        if (!player) return { leveledUp: false, newLevel: player?.level ?? 1 }
        
        player.experience = (player.experience ?? 0) + exp
        let leveledUp = false
        
        while (player.experience >= player.experienceToNextLevel) {
            player.experience -= player.experienceToNextLevel
            player.level = (player.level ?? 1) + 1
            player.experienceToNextLevel = Math.floor(player.experienceToNextLevel * 1.5) // Exponential growth
            leveledUp = true
        }
        
        return {
            leveledUp: leveledUp,
            newLevel: player.level
        }
    }
    
    /**
     * Get all character stats for display
     * @param {Object} player - Player object
     * @returns {Object} Character stats
     */
    getCharacterStats(player) {
        if (!player) return null
        
        return {
            level: player.level ?? 1,
            experience: player.experience ?? 0,
            experienceToNextLevel: player.experienceToNextLevel ?? 100,
            health: player.health ?? 100,
            maxHealth: player.maxHealth ?? 100,
            mana: player.mana ?? 50,
            maxMana: player.maxMana ?? 50,
            movementSpeed: (player.movementSpeed ?? 1.0).toFixed(2),
            damageMultiplier: (player.damageMultiplier ?? 1.0).toFixed(2),
            attackSpeedMultiplier: (player.attackSpeedMultiplier ?? 1.0).toFixed(2),
            defense: player.defense ?? 0
        }
    }
}

module.exports = new CharacterUpgrades()

