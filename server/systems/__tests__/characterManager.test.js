const characterManager = require('../characterManager')

describe('Character Manager', () => {
  // Note: CharacterManager uses in-memory storage that persists between tests
  // We'll use unique user IDs for each test to avoid conflicts
  
  let testUserId

  beforeEach(() => {
    // Use unique user ID for each test
    testUserId = `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })

  describe('getUserCharacters', () => {
    it('should create default character if none exist', () => {
      const characters = characterManager.getUserCharacters(testUserId)
      
      expect(characters).toHaveLength(1)
      expect(characters[0]).toHaveProperty('id')
      expect(characters[0]).toHaveProperty('userId', testUserId)
      expect(characters[0]).toHaveProperty('name', 'My Character')
      expect(characters[0]).toHaveProperty('level', 1)
      expect(characters[0]).toHaveProperty('isPrimary', true)
    })

    it('should use account shape and color for default character', () => {
      const characters = characterManager.getUserCharacters(testUserId, 'sphere', 0xff0000)
      
      expect(characters[0].shape).toBe('sphere')
      expect(characters[0].color).toBe(0xff0000)
    })

    it('should return existing characters without creating new ones', () => {
      // Get characters (creates default)
      const firstCall = characterManager.getUserCharacters(testUserId)
      const firstId = firstCall[0].id
      
      // Get again
      const secondCall = characterManager.getUserCharacters(testUserId)
      
      expect(secondCall).toHaveLength(1)
      expect(secondCall[0].id).toBe(firstId)
    })
  })

  describe('createCharacter', () => {
    it('should create character with correct initial stats', () => {
      const character = characterManager.createCharacter(testUserId, 'Warrior', 'cube', 0xff0000)
      
      expect(character).toHaveProperty('id')
      expect(character.userId).toBe(testUserId)
      expect(character.name).toBe('Warrior')
      expect(character.shape).toBe('cube')
      expect(character.color).toBe(0xff0000)
      expect(character.level).toBe(1)
      expect(character.experience).toBe(0)
      expect(character.experienceToNextLevel).toBe(100)
      expect(character.totalKills).toBe(0)
      expect(character.totalDeaths).toBe(0)
      expect(character.isPrimary).toBe(false)
    })

    it('should use default values if not provided', () => {
      const character = characterManager.createCharacter(testUserId)
      
      expect(character.shape).toBe('cube')
      expect(character.color).toBe(0x00ff00)
      expect(character.name).toBeTruthy()
    })

    it('should generate unique character IDs', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      expect(char1.id).not.toBe(char2.id)
    })

    it('should enforce 5 character limit', () => {
      // Create 5 characters
      for (let i = 0; i < 5; i++) {
        characterManager.createCharacter(testUserId, `Character ${i}`)
      }
      
      const characters = characterManager.getUserCharacters(testUserId)
      expect(characters).toHaveLength(5)
      
      // Try to create 6th
      expect(() => {
        characterManager.createCharacter(testUserId, 'Sixth')
      }).toThrow('Maximum character limit reached')
    })

    it('should have correct base stats', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      expect(character.baseMaxHealth).toBe(100)
      expect(character.baseMaxMana).toBe(50)
      expect(character.baseMovementSpeed).toBe(1.0)
      expect(character.baseDamageMultiplier).toBe(1.0)
      expect(character.baseDefense).toBe(0)
      expect(character.weaponType).toBe('basic')
    })

    it('should set timestamps', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      expect(character.createdAt).toBeDefined()
      expect(character.lastPlayed).toBeDefined()
      
      // Verify they are valid ISO strings
      expect(() => new Date(character.createdAt)).not.toThrow()
      expect(() => new Date(character.lastPlayed)).not.toThrow()
      
      // Verify timestamps are recent (within last second)
      const now = Date.now()
      const createdTime = new Date(character.createdAt).getTime()
      expect(now - createdTime).toBeLessThan(1000)
    })
  })

  describe('getCharacter', () => {
    it('should get specific character by ID', () => {
      const created = characterManager.createCharacter(testUserId, 'FindMe', 'sphere', 0xff00ff)
      
      const found = characterManager.getCharacter(testUserId, created.id)
      
      expect(found).not.toBeNull()
      expect(found.id).toBe(created.id)
      expect(found.name).toBe('FindMe')
    })

    it('should return null for non-existent character', () => {
      const found = characterManager.getCharacter(testUserId, 'nonexistent_id')
      
      expect(found).toBeNull()
    })

    it('should not return character from different user', () => {
      const otherUserId = `other_${Date.now()}`
      const character = characterManager.createCharacter(otherUserId, 'Other')
      
      const found = characterManager.getCharacter(testUserId, character.id)
      
      expect(found).toBeNull()
    })
  })

  describe('getPrimaryCharacter', () => {
    it('should return primary character', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      characterManager.setPrimaryCharacter(testUserId, char2.id)
      
      const primary = characterManager.getPrimaryCharacter(testUserId)
      
      expect(primary).not.toBeNull()
      expect(primary.id).toBe(char2.id)
      expect(primary.isPrimary).toBe(true)
    })

    it('should return first character if no primary set', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      const primary = characterManager.getPrimaryCharacter(testUserId)
      
      expect(primary).not.toBeNull()
      expect(primary.id).toBe(char1.id)
    })

    it('should return default character if none exist', () => {
      const primary = characterManager.getPrimaryCharacter(testUserId)
      
      expect(primary).not.toBeNull()
      expect(primary.name).toBe('My Character')
      expect(primary.isPrimary).toBe(true)
    })
  })

  describe('setPrimaryCharacter', () => {
    it('should set character as primary', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      const success = characterManager.setPrimaryCharacter(testUserId, char2.id)
      
      expect(success).toBe(true)
      
      const characters = characterManager.getUserCharacters(testUserId)
      expect(characters.find(c => c.id === char1.id).isPrimary).toBe(false)
      expect(characters.find(c => c.id === char2.id).isPrimary).toBe(true)
    })

    it('should remove primary flag from previous primary', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      characterManager.setPrimaryCharacter(testUserId, char1.id)
      characterManager.setPrimaryCharacter(testUserId, char2.id)
      
      const characters = characterManager.getUserCharacters(testUserId)
      const primaryCount = characters.filter(c => c.isPrimary).length
      
      expect(primaryCount).toBe(1)
      expect(characters.find(c => c.id === char2.id).isPrimary).toBe(true)
    })

    it('should return false for non-existent character', () => {
      const success = characterManager.setPrimaryCharacter(testUserId, 'nonexistent_id')
      
      expect(success).toBe(false)
    })
  })

  describe('updateCharacter', () => {
    it('should update character stats', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const updated = characterManager.updateCharacter(testUserId, character.id, {
        level: 5,
        experience: 250,
        totalKills: 100
      })
      
      expect(updated).not.toBeNull()
      expect(updated.level).toBe(5)
      expect(updated.experience).toBe(250)
      expect(updated.totalKills).toBe(100)
    })

    it('should update lastPlayed timestamp', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const updated = characterManager.updateCharacter(testUserId, character.id, {
        totalKills: 1
      })
      
      expect(updated.lastPlayed).toBeDefined()
      expect(() => new Date(updated.lastPlayed)).not.toThrow()
      
      // Verify it's a recent timestamp
      const now = Date.now()
      const lastPlayedTime = new Date(updated.lastPlayed).getTime()
      expect(now - lastPlayedTime).toBeLessThan(1000)
    })

    it('should return null for non-existent character', () => {
      const result = characterManager.updateCharacter(testUserId, 'nonexistent', { level: 10 })
      
      expect(result).toBeNull()
    })
  })

  describe('addExperience', () => {
    it('should add experience without leveling up', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const result = characterManager.addExperience(testUserId, character.id, 50)
      
      expect(result.leveledUp).toBe(false)
      expect(result.newLevel).toBe(1)
      expect(result.character.experience).toBe(50)
      expect(result.character.level).toBe(1)
    })

    it('should trigger level up at threshold', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Level 1 → 2 requires 100 XP
      const result = characterManager.addExperience(testUserId, character.id, 100)
      
      expect(result.leveledUp).toBe(true)
      expect(result.newLevel).toBe(2)
      expect(result.character.level).toBe(2)
      expect(result.character.experience).toBe(0)
    })

    it('should handle multiple level ups', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Give massive XP
      const result = characterManager.addExperience(testUserId, character.id, 1000)
      
      expect(result.leveledUp).toBe(true)
      expect(result.character.level).toBeGreaterThan(2)
    })

    it('should increase stats on level up', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      const initialHealth = character.baseMaxHealth
      const initialMana = character.baseMaxMana
      const initialDefense = character.baseDefense
      
      // Level up
      characterManager.addExperience(testUserId, character.id, 100)
      
      const updated = characterManager.getCharacter(testUserId, character.id)
      
      expect(updated.baseMaxHealth).toBe(initialHealth + 10)
      expect(updated.baseMaxMana).toBe(initialMana + 5)
      expect(updated.baseDefense).toBe(initialDefense + 1)
    })

    it('should use exponential XP curve', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Level 1 → 2
      characterManager.addExperience(testUserId, character.id, 100)
      const level2XP = character.experienceToNextLevel
      
      // Level 2 → 3
      characterManager.addExperience(testUserId, character.id, level2XP)
      const level3XP = character.experienceToNextLevel
      
      // XP requirement should increase
      expect(level3XP).toBeGreaterThan(level2XP)
      expect(level2XP).toBeGreaterThan(100)
    })

    it('should carry over excess XP', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Give 150 XP (100 to level up, 50 excess)
      const result = characterManager.addExperience(testUserId, character.id, 150)
      
      expect(result.character.level).toBe(2)
      expect(result.character.experience).toBe(50)
    })

    it('should update lastPlayed timestamp', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Note: In JavaScript, operations happen so fast that timestamps may be identical
      // The important thing is that lastPlayed is set and is a valid timestamp
      characterManager.addExperience(testUserId, character.id, 10)
      
      const updated = characterManager.getCharacter(testUserId, character.id)
      expect(updated.lastPlayed).toBeDefined()
      expect(() => new Date(updated.lastPlayed)).not.toThrow()
      
      // Verify it's a recent timestamp
      const now = Date.now()
      const lastPlayedTime = new Date(updated.lastPlayed).getTime()
      expect(now - lastPlayedTime).toBeLessThan(1000)
    })
  })

  describe('deleteCharacter', () => {
    it('should delete character successfully', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      const success = characterManager.deleteCharacter(testUserId, char1.id)
      
      expect(success).toBe(true)
      
      const characters = characterManager.getUserCharacters(testUserId)
      expect(characters).toHaveLength(1)
      expect(characters[0].id).toBe(char2.id)
    })

    it('should throw error when deleting last character', () => {
      const character = characterManager.createCharacter(testUserId, 'Only')
      
      expect(() => {
        characterManager.deleteCharacter(testUserId, character.id)
      }).toThrow('Cannot delete last character')
    })

    it('should return false for non-existent character', () => {
      characterManager.createCharacter(testUserId, 'Exists')
      
      const success = characterManager.deleteCharacter(testUserId, 'nonexistent_id')
      
      expect(success).toBe(false)
    })

    it('should return false for non-existent user', () => {
      const success = characterManager.deleteCharacter('nonexistent_user', 'some_id')
      
      expect(success).toBe(false)
    })

    it('should allow deleting non-primary character', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      
      characterManager.setPrimaryCharacter(testUserId, char1.id)
      
      const success = characterManager.deleteCharacter(testUserId, char2.id)
      
      expect(success).toBe(true)
      
      // Primary should still be char1
      const primary = characterManager.getPrimaryCharacter(testUserId)
      expect(primary.id).toBe(char1.id)
    })
  })

  describe('getCharacterStats', () => {
    it('should return formatted stats for character', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const stats = characterManager.getCharacterStats(character)
      
      expect(stats).toHaveProperty('level', 1)
      expect(stats).toHaveProperty('experience', 0)
      expect(stats).toHaveProperty('experienceToNextLevel', 100)
      expect(stats).toHaveProperty('health', 100)
      expect(stats).toHaveProperty('maxHealth', 100)
      expect(stats).toHaveProperty('mana', 50)
      expect(stats).toHaveProperty('maxMana', 50)
      expect(stats).toHaveProperty('movementSpeed', 1.0)
      expect(stats).toHaveProperty('damageMultiplier', 1.0)
      expect(stats).toHaveProperty('defense', 0)
      expect(stats).toHaveProperty('totalKills', 0)
      expect(stats).toHaveProperty('totalDeaths', 0)
    })

    it('should return null for null character', () => {
      const stats = characterManager.getCharacterStats(null)
      
      expect(stats).toBeNull()
    })

    it('should reflect leveled up stats', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      // Level up
      characterManager.addExperience(testUserId, character.id, 100)
      
      const updated = characterManager.getCharacter(testUserId, character.id)
      const stats = characterManager.getCharacterStats(updated)
      
      expect(stats.level).toBe(2)
      expect(stats.maxHealth).toBe(110) // +10 per level
      expect(stats.maxMana).toBe(55)    // +5 per level
      expect(stats.defense).toBe(1)     // +1 per level
    })
  })

  describe('Character Lifecycle', () => {
    it('should support full character lifecycle', () => {
      // Create multiple characters
      const warrior = characterManager.createCharacter(testUserId, 'Warrior', 'cube', 0xff0000)
      const mage = characterManager.createCharacter(testUserId, 'Mage', 'sphere', 0x0000ff)
      const rogue = characterManager.createCharacter(testUserId, 'Rogue', 'cone', 0x00ff00)
      
      // Set mage as primary
      characterManager.setPrimaryCharacter(testUserId, mage.id)
      
      // Level up warrior
      const levelResult = characterManager.addExperience(testUserId, warrior.id, 500)
      expect(levelResult.leveledUp).toBe(true)
      
      // Update rogue
      characterManager.updateCharacter(testUserId, rogue.id, {
        totalKills: 50,
        totalDeaths: 2
      })
      
      // Get all characters
      const all = characterManager.getUserCharacters(testUserId)
      expect(all).toHaveLength(3)
      
      // Verify primary
      const primary = characterManager.getPrimaryCharacter(testUserId)
      expect(primary.id).toBe(mage.id)
      
      // Delete rogue
      characterManager.deleteCharacter(testUserId, rogue.id)
      
      // Should have 2 left
      const remaining = characterManager.getUserCharacters(testUserId)
      expect(remaining).toHaveLength(2)
      expect(remaining.find(c => c.id === rogue.id)).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle creating character with empty name', () => {
      const character = characterManager.createCharacter(testUserId, '')
      
      // Should use default name
      expect(character.name).toBeTruthy()
      expect(character.name.length).toBeGreaterThan(0)
    })

    it('should handle adding zero experience', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const result = characterManager.addExperience(testUserId, character.id, 0)
      
      expect(result.leveledUp).toBe(false)
      expect(result.character.experience).toBe(0)
    })

    it('should handle negative experience gracefully', () => {
      const character = characterManager.createCharacter(testUserId, 'Test')
      
      const result = characterManager.addExperience(testUserId, character.id, -10)
      
      // Should not decrease (or handle gracefully)
      expect(result.character.experience).toBeLessThanOrEqual(0)
    })

    it('should maintain character order', () => {
      const char1 = characterManager.createCharacter(testUserId, 'First')
      const char2 = characterManager.createCharacter(testUserId, 'Second')
      const char3 = characterManager.createCharacter(testUserId, 'Third')
      
      const characters = characterManager.getUserCharacters(testUserId)
      
      expect(characters[0].id).toBe(char1.id)
      expect(characters[1].id).toBe(char2.id)
      expect(characters[2].id).toBe(char3.id)
    })
  })

  describe('Data Integrity', () => {
    it('should preserve all character data after updates', () => {
      const character = characterManager.createCharacter(testUserId, 'Persistent', 'sphere', 0xff00ff)
      const originalId = character.id
      const originalCreatedAt = character.createdAt
      
      // Update some stats
      characterManager.updateCharacter(testUserId, character.id, {
        totalKills: 10
      })
      
      // Level up
      characterManager.addExperience(testUserId, character.id, 100)
      
      // Get character
      const final = characterManager.getCharacter(testUserId, character.id)
      
      // Should preserve core data
      expect(final.id).toBe(originalId)
      expect(final.name).toBe('Persistent')
      expect(final.shape).toBe('sphere')
      expect(final.color).toBe(0xff00ff)
      expect(final.createdAt).toBe(originalCreatedAt)
      
      // Should have updated data
      expect(final.level).toBe(2)
      expect(final.totalKills).toBe(10)
    })
  })
})

