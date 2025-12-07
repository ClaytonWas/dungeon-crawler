// Mock node-fetch before requiring characterManager
jest.mock('node-fetch')
const fetch = require('node-fetch')

const characterManager = require('../characterManager')

// Helper to mock fetch responses - call in sequence for multiple fetches
const mockFetchResponse = (data, ok = true) => {
  fetch.mockResolvedValueOnce({
    ok,
    json: jest.fn().mockResolvedValueOnce(data)
  })
}

describe('CharacterManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear the internal cache
    characterManager.invalidateCache('user1')
    characterManager.invalidateCache('user999')
  })

  describe('getUserCharacters', () => {
    it('should return characters from API', async () => {
      const mockCharacters = [
        { id: 'char1', name: 'Hero', shape: 'cube', level: 5, isPrimary: true }
      ]
      // First fetch: /api/characters (auth check)
      mockFetchResponse({})
      // Second fetch: /api/characters/user/:userId
      mockFetchResponse({ characters: mockCharacters })

      const characters = await characterManager.getUserCharacters('user1')
      
      expect(characters).toEqual(mockCharacters)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should return empty array and attempt to create default when API returns not ok', async () => {
      // First fetch: /api/characters
      mockFetchResponse({})
      // Second fetch: /api/characters/user/:userId - fails
      mockFetchResponse({ message: 'Not found' }, false)
      // Third fetch: createCharacter POST
      mockFetchResponse({ character: { id: 'new1', name: 'My Character' } })
      // Fourth fetch: setPrimaryCharacter PUT
      mockFetchResponse({ character: { id: 'new1', isPrimary: true } })

      const characters = await characterManager.getUserCharacters('user999')
      
      expect(Array.isArray(characters)).toBe(true)
    })
  })

  describe('createCharacter', () => {
    it('should create a character via POST request', async () => {
      const mockCharacter = {
        id: 'char1',
        name: 'Warrior',
        shape: 'cube',
        color: '#ff0000',
        level: 1
      }
      mockFetchResponse({ character: mockCharacter })

      const character = await characterManager.createCharacter('user1', 'Warrior', 'cube', '#ff0000')

      expect(character).toEqual(mockCharacter)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/user/user1'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Warrior', shape: 'cube', color: '#ff0000' })
        })
      )
    })

    it('should throw error when API fails', async () => {
      mockFetchResponse({ message: 'Server error' }, false)

      await expect(characterManager.createCharacter('user1', 'Test', 'cube', '#000'))
        .rejects.toThrow()
    })
  })

  describe('getCharacter', () => {
    it('should get a specific character by ID', async () => {
      const mockCharacter = { id: 'char1', name: 'Hero', level: 10 }
      mockFetchResponse({ character: mockCharacter })

      const character = await characterManager.getCharacter('user1', 'char1')

      expect(character).toEqual(mockCharacter)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/char1')
      )
    })

    it('should return null when character not found', async () => {
      mockFetchResponse({}, false)

      const character = await characterManager.getCharacter('user1', 'nonexistent')

      expect(character).toBeNull()
    })
  })

  describe('getPrimaryCharacter', () => {
    it('should get primary character for user', async () => {
      const mockCharacter = { id: 'char1', name: 'Main', isPrimary: true }
      mockFetchResponse({ character: mockCharacter })

      const character = await characterManager.getPrimaryCharacter('user1')

      expect(character).toEqual(mockCharacter)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/user/user1/primary')
      )
    })

    it('should return null when no primary character', async () => {
      mockFetchResponse({}, false)

      const character = await characterManager.getPrimaryCharacter('user999')

      expect(character).toBeNull()
    })
  })

  describe('setPrimaryCharacter', () => {
    it('should set character as primary via PUT', async () => {
      mockFetchResponse({ character: { isPrimary: true } })

      const result = await characterManager.setPrimaryCharacter('user1', 'char2')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/char2'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isPrimary: true })
        })
      )
    })

    it('should return false when API fails', async () => {
      mockFetchResponse({}, false)

      const result = await characterManager.setPrimaryCharacter('user1', 'char999')

      expect(result).toBe(false)
    })
  })

  describe('updateCharacter', () => {
    it('should update character via PUT', async () => {
      const mockUpdated = { id: 'char1', name: 'Updated Name', level: 5 }
      mockFetchResponse({ character: mockUpdated })

      const character = await characterManager.updateCharacter('user1', 'char1', { name: 'Updated Name' })

      expect(character).toEqual(mockUpdated)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/char1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' })
        })
      )
    })

    it('should return null when API fails', async () => {
      mockFetchResponse({}, false)

      const character = await characterManager.updateCharacter('user1', 'char1', { level: 99 })

      expect(character).toBeNull()
    })
  })

  describe('addExperience', () => {
    it('should add experience via PATCH', async () => {
      const mockCharacter = { id: 'char1', level: 2, experience: 50 }
      mockFetchResponse({ character: mockCharacter })

      const result = await characterManager.addExperience('user1', 'char1', 100)

      expect(result.character).toEqual(mockCharacter)
      expect(result.newLevel).toBe(2)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/char1/stats'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ experience: 100 })
        })
      )
    })

    it('should return default result when API fails', async () => {
      mockFetchResponse({}, false)

      const result = await characterManager.addExperience('user1', 'char1', 50)

      expect(result.leveledUp).toBe(false)
      expect(result.character).toBeNull()
    })
  })

  describe('deleteCharacter', () => {
    it('should delete character via DELETE', async () => {
      mockFetchResponse({ success: true })

      const result = await characterManager.deleteCharacter('user1', 'char1')

      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/characters/char1/user/user1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should throw when API returns error with message', async () => {
      mockFetchResponse({ message: 'Cannot delete primary' }, false)

      await expect(characterManager.deleteCharacter('user1', 'char1'))
        .rejects.toThrow('Cannot delete primary')
    })
  })

  describe('getCharacterStats', () => {
    it('should return formatted stats object', () => {
      const character = {
        level: 10,
        experience: 500,
        experienceToNextLevel: 1000,
        baseMaxHealth: 200,
        baseMaxMana: 100,
        baseMovementSpeed: 1.5,
        baseDamageMultiplier: 1.2,
        baseDefense: 15,
        totalKills: 50,
        totalDeaths: 5
      }

      const stats = characterManager.getCharacterStats(character)

      expect(stats).toEqual({
        level: 10,
        experience: 500,
        experienceToNextLevel: 1000,
        health: 200,
        maxHealth: 200,
        mana: 100,
        maxMana: 100,
        movementSpeed: 1.5,
        damageMultiplier: 1.2,
        defense: 15,
        totalKills: 50,
        totalDeaths: 5
      })
    })

    it('should return null for null character', () => {
      expect(characterManager.getCharacterStats(null)).toBeNull()
    })
  })

  describe('invalidateCache', () => {
    it('should not throw when invalidating cache', () => {
      expect(() => characterManager.invalidateCache('user1')).not.toThrow()
    })
  })
})

