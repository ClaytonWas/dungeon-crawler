/**
 * CHARACTER MANAGER
 * 
 * Handles multiple characters per user account.
 * Each character has persistent stats (level, experience, etc.)
 * Users can create, select, delete, and level up characters.
 */

// In-memory storage (TODO: Replace with database)
const userCharacters = new Map() // userId -> Array of character objects

class CharacterManager {
    /**
     * Get all characters for a user
     * @param {String} userId - User ID
     * @param {String} accountShape - Optional account default shape
     * @param {Number} accountColor - Optional account default color
     * @returns {Array} Array of character objects
     */
    getUserCharacters(userId, accountShape = 'cube', accountColor = 0x00ff00) {
        if (!userCharacters.has(userId)) {
            // Create default character if none exist and mark as primary
            // Use account's shape and color if provided
            const defaultChar = this.createCharacter(userId, 'My Character', accountShape, accountColor)
            defaultChar.isPrimary = true
            return [defaultChar]
        }
        return userCharacters.get(userId)
    }
    
    /**
     * Get primary character for a user
     * @param {String} userId - User ID
     * @returns {Object|null} Primary character or null
     */
    getPrimaryCharacter(userId) {
        const characters = this.getUserCharacters(userId)
        return characters.find(c => c.isPrimary) || (characters.length > 0 ? characters[0] : null)
    }
    
    /**
     * Set a character as primary
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID to set as primary
     * @returns {Boolean} Success status
     */
    setPrimaryCharacter(userId, characterId) {
        const characters = this.getUserCharacters(userId)
        const character = characters.find(c => c.id === characterId)
        if (!character) return false
        
        // Remove primary flag from all characters
        characters.forEach(c => c.isPrimary = false)
        
        // Set new primary
        character.isPrimary = true
        return true
    }
    
    /**
     * Create a new character
     * @param {String} userId - User ID
     * @param {String} name - Character name
     * @param {String} shape - Character shape (cube, sphere, cone)
     * @param {Number} color - Character color (hex number)
     * @returns {Object} Created character
     */
    createCharacter(userId, name, shape = 'cube', color = 0x00ff00) {
        if (!userCharacters.has(userId)) {
            userCharacters.set(userId, [])
        }
        
        const characters = userCharacters.get(userId)
        
        // Check max characters (limit to 5)
        if (characters.length >= 5) {
            throw new Error('Maximum character limit reached (5 characters)')
        }
        
        const character = {
            id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            name: name || `Character ${characters.length + 1}`,
            shape: shape,
            color: color,
            
            // Persistent stats
            level: 1,
            experience: 0,
            experienceToNextLevel: 100,
            
            // Base stats (these scale with level)
            baseMaxHealth: 100,
            baseMaxMana: 50,
            baseMovementSpeed: 1.0,
            baseDamageMultiplier: 1.0,
            baseDefense: 0,
            
            // Current weapon
            weaponType: 'basic',
            
            // Metadata
            createdAt: new Date().toISOString(),
            lastPlayed: new Date().toISOString(),
            totalPlayTime: 0, // in seconds
            totalKills: 0,
            totalDeaths: 0,
            isPrimary: false // Primary character (auto-selected on login)
        }
        
        characters.push(character)
        return character
    }
    
    /**
     * Get a specific character by ID
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @returns {Object|null} Character object or null
     */
    getCharacter(userId, characterId) {
        const characters = this.getUserCharacters(userId)
        return characters.find(c => c.id === characterId) || null
    }
    
    /**
     * Update character stats (level up, experience gain, etc.)
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @param {Object} updates - Updates to apply
     * @returns {Object|null} Updated character or null
     */
    updateCharacter(userId, characterId, updates) {
        const character = this.getCharacter(userId, characterId)
        if (!character) return null
        
        Object.assign(character, updates)
        character.lastPlayed = new Date().toISOString()
        
        return character
    }
    
    /**
     * Add experience to a character
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @param {Number} expAmount - Experience to add
     * @returns {Object} { leveledUp: boolean, newLevel: number, character: Object }
     */
    addExperience(userId, characterId, expAmount) {
        const character = this.getCharacter(userId, characterId)
        if (!character) return { leveledUp: false, newLevel: character.level, character: null }
        
        character.experience += expAmount
        let leveledUp = false
        let newLevel = character.level
        
        // Level up if enough experience
        while (character.experience >= character.experienceToNextLevel) {
            character.experience -= character.experienceToNextLevel
            character.level += 1
            leveledUp = true
            newLevel = character.level
            
            // Increase stats per level
            character.baseMaxHealth += 10
            character.baseMaxMana += 5
            character.baseDefense += 1
            
            // Increase exp needed for next level (exponential)
            character.experienceToNextLevel = Math.floor(100 * Math.pow(1.2, character.level - 1))
        }
        
        character.lastPlayed = new Date().toISOString()
        
        return { leveledUp, newLevel, character }
    }
    
    /**
     * Delete a character
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @returns {Boolean} Success status
     */
    deleteCharacter(userId, characterId) {
        if (!userCharacters.has(userId)) return false
        
        const characters = userCharacters.get(userId)
        const index = characters.findIndex(c => c.id === characterId)
        
        if (index === -1) return false
        
        // Don't allow deleting if it's the last character
        if (characters.length <= 1) {
            throw new Error('Cannot delete last character')
        }
        
        characters.splice(index, 1)
        return true
    }
    
    /**
     * Get character stats for display
     * @param {Object} character - Character object
     * @returns {Object} Stats object
     */
    getCharacterStats(character) {
        if (!character) return null
        
        return {
            level: character.level,
            experience: character.experience,
            experienceToNextLevel: character.experienceToNextLevel,
            health: character.baseMaxHealth, // Current health would be in-match only
            maxHealth: character.baseMaxHealth,
            mana: character.baseMaxMana,
            maxMana: character.baseMaxMana,
            movementSpeed: character.baseMovementSpeed,
            damageMultiplier: character.baseDamageMultiplier,
            defense: character.baseDefense,
            totalKills: character.totalKills,
            totalDeaths: character.totalDeaths
        }
    }
}

const characterManager = new CharacterManager()

module.exports = characterManager

