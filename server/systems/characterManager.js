/**
 * CHARACTER MANAGER
 * 
 * Handles multiple characters per user account.
 * Each character has persistent stats (level, experience, etc.)
 * Now backed by Profile API database for persistence across server restarts.
 */

const fetch = require('node-fetch')

const PROFILE_API = process.env.PROFILE_API_URL || 'http://profile-api:3001'

// Local cache for performance (reduces API calls during gameplay)
const characterCache = new Map() // userId -> { characters: [], lastFetch: timestamp }
const CACHE_TTL = 60 * 1000 // 1 minute cache

class CharacterManager {
    /**
     * Get all characters for a user (fetches from API, uses cache)
     * @param {String} userId - User ID
     * @param {String} accountShape - Optional account default shape (for creating default char)
     * @param {String} accountColor - Optional account default color
     * @returns {Promise<Array>} Array of character objects
     */
    async getUserCharacters(userId, accountShape = 'cube', accountColor = '#00ff00') {
        // Check cache first
        const cached = characterCache.get(userId)
        if (cached && Date.now() - cached.lastFetch < CACHE_TTL) {
            return cached.characters
        }

        try {
            const response = await fetch(`${PROFILE_API}/api/characters`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })

            // This endpoint requires auth, so we need internal API access
            // For now, use internal endpoint that doesn't require session
            const internalResponse = await fetch(`${PROFILE_API}/api/characters/user/${userId}`)
            
            if (!internalResponse.ok) {
                // Fallback: user has no characters yet, create default
                console.log(`[CharacterManager] No characters for user ${userId}, creating default`)
                const defaultChar = await this.createCharacter(userId, 'My Character', accountShape, accountColor)
                // Set as primary
                await this.setPrimaryCharacter(userId, defaultChar.id)
                return [{ ...defaultChar, isPrimary: true }]
            }

            const data = await internalResponse.json()
            const characters = data.characters || []
            
            // Update cache
            characterCache.set(userId, { characters, lastFetch: Date.now() })
            
            return characters
        } catch (error) {
            console.error('[CharacterManager] Error fetching characters:', error)
            // Return cached data if available, even if stale
            if (cached) return cached.characters
            return []
        }
    }
    
    /**
     * Sync version for backward compatibility (uses cache only)
     * Should be called after async fetch has populated cache
     */
    getUserCharactersSync(userId) {
        const cached = characterCache.get(userId)
        return cached?.characters || []
    }
    
    /**
     * Get primary character for a user
     * @param {String} userId - User ID
     * @returns {Promise<Object|null>} Primary character or null
     */
    async getPrimaryCharacter(userId) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/user/${userId}/primary`)
            
            if (!response.ok) {
                return null
            }

            const data = await response.json()
            return data.character || null
        } catch (error) {
            console.error('[CharacterManager] Error fetching primary character:', error)
            // Try from cache
            const cached = characterCache.get(userId)
            if (cached) {
                return cached.characters.find(c => c.isPrimary) || cached.characters[0] || null
            }
            return null
        }
    }
    
    /**
     * Set a character as primary
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID to set as primary
     * @returns {Promise<Boolean>} Success status
     */
    async setPrimaryCharacter(userId, characterId) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/${characterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPrimary: true })
            })
            
            if (response.ok) {
                // Invalidate cache
                characterCache.delete(userId)
                return true
            }
            return false
        } catch (error) {
            console.error('[CharacterManager] Error setting primary character:', error)
            return false
        }
    }
    
    /**
     * Create a new character
     * @param {String} userId - User ID
     * @param {String} name - Character name
     * @param {String} shape - Character shape (cube, sphere, cone)
     * @param {String} color - Character color (hex string)
     * @returns {Promise<Object>} Created character
     */
    async createCharacter(userId, name, shape = 'cube', color = '#00ff00') {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/user/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, shape, color })
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to create character')
            }

            const data = await response.json()
            
            // Invalidate cache
            characterCache.delete(userId)
            
            return data.character
        } catch (error) {
            console.error('[CharacterManager] Error creating character:', error)
            throw error
        }
    }
    
    /**
     * Get a specific character by ID
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @returns {Promise<Object|null>} Character object or null
     */
    async getCharacter(userId, characterId) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/${characterId}`)
            
            if (!response.ok) {
                return null
            }

            const data = await response.json()
            return data.character || null
        } catch (error) {
            console.error('[CharacterManager] Error fetching character:', error)
            // Try from cache
            const cached = characterCache.get(userId)
            if (cached) {
                return cached.characters.find(c => c.id === characterId) || null
            }
            return null
        }
    }
    
    /**
     * Update character stats (calls Profile API)
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object|null>} Updated character or null
     */
    async updateCharacter(userId, characterId, updates) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/${characterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            
            if (!response.ok) {
                return null
            }

            const data = await response.json()
            
            // Invalidate cache
            characterCache.delete(userId)
            
            return data.character
        } catch (error) {
            console.error('[CharacterManager] Error updating character:', error)
            return null
        }
    }
    
    /**
     * Add experience to a character (and handle level ups via API)
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @param {Number} expAmount - Experience to add
     * @returns {Promise<Object>} { leveledUp: boolean, newLevel: number, character: Object }
     */
    async addExperience(userId, characterId, expAmount) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/${characterId}/stats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experience: expAmount })
            })
            
            if (!response.ok) {
                return { leveledUp: false, newLevel: 1, character: null }
            }

            const data = await response.json()
            const character = data.character
            
            // Invalidate cache
            characterCache.delete(userId)
            
            // Check if leveled up by comparing (would need previous level)
            const cached = characterCache.get(userId)
            const oldChar = cached?.characters?.find(c => c.id === characterId)
            const leveledUp = oldChar ? character.level > oldChar.level : false
            
            return { leveledUp, newLevel: character.level, character }
        } catch (error) {
            console.error('[CharacterManager] Error adding experience:', error)
            return { leveledUp: false, newLevel: 1, character: null }
        }
    }
    
    /**
     * Update character combat stats (kills, deaths, playtime)
     * @param {String} characterId - Character ID
     * @param {Object} stats - { kills, deaths, playTime }
     */
    async updateCombatStats(characterId, stats) {
        try {
            await fetch(`${PROFILE_API}/api/characters/${characterId}/stats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stats)
            })
        } catch (error) {
            console.error('[CharacterManager] Error updating combat stats:', error)
        }
    }
    
    /**
     * Delete a character
     * @param {String} userId - User ID
     * @param {String} characterId - Character ID
     * @returns {Promise<Boolean>} Success status
     */
    async deleteCharacter(userId, characterId) {
        try {
            const response = await fetch(`${PROFILE_API}/api/characters/${characterId}/user/${userId}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                // Invalidate cache
                characterCache.delete(userId)
                return true
            }
            
            const error = await response.json()
            if (error.message) {
                throw new Error(error.message)
            }
            return false
        } catch (error) {
            console.error('[CharacterManager] Error deleting character:', error)
            throw error
        }
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
            health: character.baseMaxHealth,
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
    
    /**
     * Invalidate cache for a user
     * @param {String} userId - User ID
     */
    invalidateCache(userId) {
        characterCache.delete(userId)
    }
}

const characterManager = new CharacterManager()

module.exports = characterManager

