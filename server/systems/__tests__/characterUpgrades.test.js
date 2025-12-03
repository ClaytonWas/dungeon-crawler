const characterUpgrades = require('../characterUpgrades')

describe('Character Upgrades (In-Match)', () => {
  let testPlayer

  beforeEach(() => {
    // Create fresh player for each test
    testPlayer = {
      id: `player_${Date.now()}`,
      username: 'TestPlayer'
    }
  })

  describe('initializeStats', () => {
    it('should initialize all default stats', () => {
      characterUpgrades.initializeStats(testPlayer)

      // Base stats
      expect(testPlayer.health).toBe(100)
      expect(testPlayer.maxHealth).toBe(100)
      expect(testPlayer.mana).toBe(50)
      expect(testPlayer.maxMana).toBe(50)
      expect(testPlayer.movementSpeed).toBe(1.0)

      // Combat stats
      expect(testPlayer.damageMultiplier).toBe(1.0)
      expect(testPlayer.attackSpeedMultiplier).toBe(1.0)
      expect(testPlayer.defense).toBe(0)

      // Experience
      expect(testPlayer.level).toBe(1)
      expect(testPlayer.experience).toBe(0)
      expect(testPlayer.experienceToNextLevel).toBe(100)
    })

    it('should not overwrite existing stats', () => {
      testPlayer.health = 75
      testPlayer.maxHealth = 150
      testPlayer.level = 5

      characterUpgrades.initializeStats(testPlayer)

      expect(testPlayer.health).toBe(75)
      expect(testPlayer.maxHealth).toBe(150)
      expect(testPlayer.level).toBe(5)
    })

    it('should handle null player gracefully', () => {
      expect(() => {
        characterUpgrades.initializeStats(null)
      }).not.toThrow()
    })
  })

  describe('upgradeHealth', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should increase max health and heal', () => {
      testPlayer.health = 100
      testPlayer.maxHealth = 100

      const success = characterUpgrades.upgradeHealth(testPlayer, 20)

      expect(success).toBe(true)
      expect(testPlayer.maxHealth).toBe(120)
      expect(testPlayer.health).toBe(120) // Heals when upgrading
    })

    it('should not overheal beyond new max', () => {
      testPlayer.health = 50
      testPlayer.maxHealth = 100

      characterUpgrades.upgradeHealth(testPlayer, 30)

      expect(testPlayer.maxHealth).toBe(130)
      expect(testPlayer.health).toBe(80) // 50 + 30
    })

    it('should work with damaged player', () => {
      testPlayer.health = 40
      testPlayer.maxHealth = 100

      characterUpgrades.upgradeHealth(testPlayer, 50)

      expect(testPlayer.maxHealth).toBe(150)
      expect(testPlayer.health).toBe(90) // 40 + 50
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeHealth(null, 20)
      expect(success).toBe(false)
    })
  })

  describe('upgradeMovementSpeed', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should multiply movement speed', () => {
      testPlayer.movementSpeed = 1.0

      const success = characterUpgrades.upgradeMovementSpeed(testPlayer, 1.2)

      expect(success).toBe(true)
      expect(testPlayer.movementSpeed).toBeCloseTo(1.2, 2)
    })

    it('should stack multiplicatively', () => {
      testPlayer.movementSpeed = 1.0

      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.1) // 1.1
      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.1) // 1.21

      expect(testPlayer.movementSpeed).toBeCloseTo(1.21, 2)
    })

    it('should allow speed reduction', () => {
      testPlayer.movementSpeed = 1.0

      characterUpgrades.upgradeMovementSpeed(testPlayer, 0.8)

      expect(testPlayer.movementSpeed).toBeCloseTo(0.8, 2)
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeMovementSpeed(null, 1.5)
      expect(success).toBe(false)
    })
  })

  describe('upgradeMana', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should increase max mana and restore', () => {
      testPlayer.mana = 50
      testPlayer.maxMana = 50

      const success = characterUpgrades.upgradeMana(testPlayer, 20)

      expect(success).toBe(true)
      expect(testPlayer.maxMana).toBe(70)
      expect(testPlayer.mana).toBe(70) // Restores when upgrading
    })

    it('should not over-restore beyond new max', () => {
      testPlayer.mana = 20
      testPlayer.maxMana = 50

      characterUpgrades.upgradeMana(testPlayer, 30)

      expect(testPlayer.maxMana).toBe(80)
      expect(testPlayer.mana).toBe(50) // 20 + 30
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeMana(null, 20)
      expect(success).toBe(false)
    })
  })

  describe('upgradeDamageMultiplier', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should multiply damage multiplier', () => {
      testPlayer.damageMultiplier = 1.0

      const success = characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.25)

      expect(success).toBe(true)
      expect(testPlayer.damageMultiplier).toBeCloseTo(1.25, 2)
    })

    it('should stack multiplicatively', () => {
      testPlayer.damageMultiplier = 1.0

      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.2) // 1.2
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.5) // 1.8

      expect(testPlayer.damageMultiplier).toBeCloseTo(1.8, 2)
    })

    it('should allow damage reduction', () => {
      testPlayer.damageMultiplier = 1.5

      characterUpgrades.upgradeDamageMultiplier(testPlayer, 0.5)

      expect(testPlayer.damageMultiplier).toBeCloseTo(0.75, 2)
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeDamageMultiplier(null, 1.5)
      expect(success).toBe(false)
    })
  })

  describe('upgradeAttackSpeed', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
      testPlayer.attackCooldown = 1000
    })

    it('should multiply attack speed multiplier', () => {
      testPlayer.attackSpeedMultiplier = 1.0

      const success = characterUpgrades.upgradeAttackSpeed(testPlayer, 1.5)

      expect(success).toBe(true)
      expect(testPlayer.attackSpeedMultiplier).toBeCloseTo(1.5, 2)
    })

    it('should reduce attack cooldown', () => {
      testPlayer.attackSpeedMultiplier = 1.0
      testPlayer.attackCooldown = 1000

      characterUpgrades.upgradeAttackSpeed(testPlayer, 2.0)

      // Cooldown should be halved (1000 / 2.0 = 500)
      expect(testPlayer.attackCooldown).toBeCloseTo(500, 2)
    })

    it('should stack multiplicatively', () => {
      testPlayer.attackSpeedMultiplier = 1.0
      testPlayer.attackCooldown = 1000

      characterUpgrades.upgradeAttackSpeed(testPlayer, 1.5) // 1.5x speed
      const firstCooldown = testPlayer.attackCooldown // 1000 / 1.5 = 666.67
      
      characterUpgrades.upgradeAttackSpeed(testPlayer, 1.2) // 1.8x total speed
      // Note: Implementation divides current cooldown by new total multiplier
      // So: 666.67 / 1.8 = 370.37 (not 1000 / 1.8 = 555.56)

      expect(testPlayer.attackSpeedMultiplier).toBeCloseTo(1.8, 2)
      expect(testPlayer.attackCooldown).toBeCloseTo(firstCooldown / 1.8, 2) // 370.37
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeAttackSpeed(null, 1.5)
      expect(success).toBe(false)
    })
  })

  describe('upgradeDefense', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should increase defense additively', () => {
      testPlayer.defense = 0

      const success = characterUpgrades.upgradeDefense(testPlayer, 5)

      expect(success).toBe(true)
      expect(testPlayer.defense).toBe(5)
    })

    it('should stack additively', () => {
      testPlayer.defense = 0

      characterUpgrades.upgradeDefense(testPlayer, 3)
      characterUpgrades.upgradeDefense(testPlayer, 2)
      characterUpgrades.upgradeDefense(testPlayer, 5)

      expect(testPlayer.defense).toBe(10)
    })

    it('should allow negative defense', () => {
      testPlayer.defense = 10

      characterUpgrades.upgradeDefense(testPlayer, -3)

      expect(testPlayer.defense).toBe(7)
    })

    it('should return false for null player', () => {
      const success = characterUpgrades.upgradeDefense(null, 5)
      expect(success).toBe(false)
    })
  })

  describe('addExperience', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should add experience without leveling', () => {
      const result = characterUpgrades.addExperience(testPlayer, 50)

      expect(result.leveledUp).toBe(false)
      expect(result.newLevel).toBe(1)
      expect(testPlayer.experience).toBe(50)
      expect(testPlayer.level).toBe(1)
    })

    it('should trigger level up at threshold', () => {
      const result = characterUpgrades.addExperience(testPlayer, 100)

      expect(result.leveledUp).toBe(true)
      expect(result.newLevel).toBe(2)
      expect(testPlayer.level).toBe(2)
      expect(testPlayer.experience).toBe(0)
    })

    it('should handle multiple level ups', () => {
      const result = characterUpgrades.addExperience(testPlayer, 500)

      expect(result.leveledUp).toBe(true)
      expect(testPlayer.level).toBeGreaterThan(2)
    })

    it('should use exponential XP curve', () => {
      const initialReq = testPlayer.experienceToNextLevel

      characterUpgrades.addExperience(testPlayer, 100) // Level 1 → 2
      const level2Req = testPlayer.experienceToNextLevel

      characterUpgrades.addExperience(testPlayer, level2Req) // Level 2 → 3
      const level3Req = testPlayer.experienceToNextLevel

      // XP requirement should grow (1.5x multiplier)
      expect(level2Req).toBeGreaterThan(initialReq)
      expect(level3Req).toBeGreaterThan(level2Req)
      expect(level2Req).toBeCloseTo(initialReq * 1.5, 0)
    })

    it('should carry over excess XP', () => {
      const result = characterUpgrades.addExperience(testPlayer, 150)

      expect(result.leveledUp).toBe(true)
      expect(testPlayer.level).toBe(2)
      expect(testPlayer.experience).toBe(50) // 150 - 100
    })

    it('should handle null player gracefully', () => {
      const result = characterUpgrades.addExperience(null, 100)

      expect(result.leveledUp).toBe(false)
      expect(result.newLevel).toBe(1)
    })

    it('should handle zero experience', () => {
      const result = characterUpgrades.addExperience(testPlayer, 0)

      expect(result.leveledUp).toBe(false)
      expect(testPlayer.experience).toBe(0)
      expect(testPlayer.level).toBe(1)
    })
  })

  describe('getCharacterStats', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should return formatted stats', () => {
      const stats = characterUpgrades.getCharacterStats(testPlayer)

      expect(stats).toHaveProperty('level', 1)
      expect(stats).toHaveProperty('experience', 0)
      expect(stats).toHaveProperty('experienceToNextLevel', 100)
      expect(stats).toHaveProperty('health', 100)
      expect(stats).toHaveProperty('maxHealth', 100)
      expect(stats).toHaveProperty('mana', 50)
      expect(stats).toHaveProperty('maxMana', 50)
      expect(stats).toHaveProperty('movementSpeed', '1.00')
      expect(stats).toHaveProperty('damageMultiplier', '1.00')
      expect(stats).toHaveProperty('attackSpeedMultiplier', '1.00')
      expect(stats).toHaveProperty('defense', 0)
    })

    it('should format decimal stats to 2 places', () => {
      testPlayer.movementSpeed = 1.456789
      testPlayer.damageMultiplier = 2.123456

      const stats = characterUpgrades.getCharacterStats(testPlayer)

      expect(stats.movementSpeed).toBe('1.46')
      expect(stats.damageMultiplier).toBe('2.12')
    })

    it('should return null for null player', () => {
      const stats = characterUpgrades.getCharacterStats(null)
      expect(stats).toBeNull()
    })

    it('should handle missing stats with defaults', () => {
      const barePlayer = { id: 'test' }

      const stats = characterUpgrades.getCharacterStats(barePlayer)

      expect(stats.level).toBe(1)
      expect(stats.health).toBe(100)
      expect(stats.movementSpeed).toBe('1.00')
    })

    it('should reflect upgraded stats', () => {
      characterUpgrades.upgradeHealth(testPlayer, 50)
      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.5)
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 2.0)

      const stats = characterUpgrades.getCharacterStats(testPlayer)

      expect(stats.maxHealth).toBe(150)
      expect(stats.movementSpeed).toBe('1.50')
      expect(stats.damageMultiplier).toBe('2.00')
    })
  })

  describe('Upgrade Stacking and Combinations', () => {
    beforeEach(() => {
      characterUpgrades.initializeStats(testPlayer)
    })

    it('should allow multiple different upgrades', () => {
      characterUpgrades.upgradeHealth(testPlayer, 50)
      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.2)
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.5)
      characterUpgrades.upgradeDefense(testPlayer, 5)

      expect(testPlayer.maxHealth).toBe(150)
      expect(testPlayer.movementSpeed).toBeCloseTo(1.2, 2)
      expect(testPlayer.damageMultiplier).toBeCloseTo(1.5, 2)
      expect(testPlayer.defense).toBe(5)
    })

    it('should handle vampire survivors style progression', () => {
      // Simulate picking up multiple upgrades during a run
      characterUpgrades.upgradeHealth(testPlayer, 20) // First health upgrade
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.1) // +10% damage
      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.05) // +5% speed
      characterUpgrades.upgradeHealth(testPlayer, 20) // Second health upgrade
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.15) // +15% more damage
      characterUpgrades.upgradeAttackSpeed(testPlayer, 1.2) // +20% attack speed

      expect(testPlayer.maxHealth).toBe(140) // 100 + 20 + 20
      expect(testPlayer.damageMultiplier).toBeCloseTo(1.265, 2) // 1.1 * 1.15
      expect(testPlayer.movementSpeed).toBeCloseTo(1.05, 2)
      expect(testPlayer.attackSpeedMultiplier).toBeCloseTo(1.2, 2)
    })
  })

  describe('In-Match Progression Flow', () => {
    it('should support complete in-match progression', () => {
      // Initialize fresh character
      characterUpgrades.initializeStats(testPlayer)
      expect(testPlayer.level).toBe(1)

      // Gain experience and level up
      let result = characterUpgrades.addExperience(testPlayer, 100)
      expect(result.leveledUp).toBe(true)
      expect(testPlayer.level).toBe(2)

      // Pick up upgrade: health boost
      characterUpgrades.upgradeHealth(testPlayer, 30)
      expect(testPlayer.maxHealth).toBe(130)

      // Continue playing, gain more XP
      result = characterUpgrades.addExperience(testPlayer, 150)
      expect(result.leveledUp).toBe(true)
      expect(testPlayer.level).toBe(3)

      // Pick up more upgrades
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 1.3)
      characterUpgrades.upgradeMovementSpeed(testPlayer, 1.1)

      // Final stats check
      const stats = characterUpgrades.getCharacterStats(testPlayer)
      expect(stats.level).toBe(3)
      expect(stats.maxHealth).toBe(130)
      expect(stats.damageMultiplier).toBe('1.30')
      expect(stats.movementSpeed).toBe('1.10')
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle upgrades on uninitialized player', () => {
      const barePlayer = {}

      characterUpgrades.upgradeHealth(barePlayer, 20)

      // Should work with default fallbacks
      expect(barePlayer.maxHealth).toBe(120) // 100 + 20
    })

    it('should handle extreme upgrade values', () => {
      characterUpgrades.initializeStats(testPlayer)

      characterUpgrades.upgradeHealth(testPlayer, 10000)
      characterUpgrades.upgradeMovementSpeed(testPlayer, 100)
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 50)

      expect(testPlayer.maxHealth).toBe(10100)
      expect(testPlayer.movementSpeed).toBeCloseTo(100, 2)
      expect(testPlayer.damageMultiplier).toBeCloseTo(50, 2)
    })

    it('should handle negative upgrade values', () => {
      characterUpgrades.initializeStats(testPlayer)

      characterUpgrades.upgradeMovementSpeed(testPlayer, 0.1) // Slow down
      characterUpgrades.upgradeDamageMultiplier(testPlayer, 0.5) // Reduce damage

      expect(testPlayer.movementSpeed).toBeCloseTo(0.1, 2)
      expect(testPlayer.damageMultiplier).toBeCloseTo(0.5, 2)
    })
  })
})

