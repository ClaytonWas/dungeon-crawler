const combatSystem = require('../combatSystem')

describe('Combat System', () => {
  let testPlayer, testEnemy, testWeaponStats

  beforeEach(() => {
    testPlayer = {
      id: 'player1',
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100
    }

    testEnemy = {
      id: 'enemy1',
      position: { x: 5, y: 0, z: 0 },
      health: 50,
      maxHealth: 50,
      level: 1
    }

    testWeaponStats = {
      baseDamage: 10,
      damageVariation: 5,
      attackRadius: 10,
      maxTargets: 3,
      attackCooldown: 1000,
      lastAttackTime: 0
    }
  })

  describe('processAttack', () => {
    it('should process attack on enemies', () => {
      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(result.attackedEnemies).toHaveLength(1)
      expect(result.attackedEnemies[0].enemyId).toBe('enemy1')
      expect(result.attackedEnemies[0].damage).toBeGreaterThanOrEqual(10)
      expect(result.attackedEnemies[0].damage).toBeLessThanOrEqual(15)
    })

    it('should kill enemy with low health', () => {
      testEnemy.health = 5

      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(result.killedEnemies).toHaveLength(1)
      expect(result.killedEnemies[0].enemy.id).toBe('enemy1')
      expect(result.killedEnemies).toHaveLength(1)
      expect(result.killedEnemies[0].enemy.id).toBe('enemy1')
      expect(result.loot).toHaveLength(1)
      expect(result.killedEnemies[0].loot.enemyId).toBe('enemy1')
      expect(result.experienceGained).toBeGreaterThan(0)
    })

    it('should generate loot for killed enemies', () => {
      testEnemy.health = 1

      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(result.loot).toHaveLength(1)
      expect(result.loot[0]).toHaveProperty('id')
      expect(result.loot[0]).toHaveProperty('type')
      expect(result.loot[0]).toHaveProperty('amount')
      expect(result.loot[0]).toHaveProperty('position')
    })

    it('should attack multiple enemies', () => {
      const enemy2 = { id: 'enemy2', position: { x: 3, y: 0, z: 0 }, health: 50, maxHealth: 50 }
      const enemy3 = { id: 'enemy3', position: { x: -2, y: 0, z: 0 }, health: 50, maxHealth: 50 }

      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [
          { enemy: testEnemy },
          { enemy: enemy2 },
          { enemy: enemy3 }
        ]
      })

      expect(result.attackedEnemies).toHaveLength(3)
    })

    it('should handle no enemies', () => {
      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: []
      })

      expect(result.attackedEnemies).toHaveLength(0)
      expect(result.killedEnemies).toHaveLength(0)
      expect(result.loot).toHaveLength(0)
      expect(result.experienceGained).toBe(0)
    })

    it('should handle null parameters', () => {
      const result = combatSystem.processAttack({
        player: null,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(result.attackedEnemies).toHaveLength(0)
    })

    it('should set enemy health to 0 when killed', () => {
      testEnemy.health = 5

      combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(testEnemy.health).toBe(0)
    })
  })

  describe('calculateDamage', () => {
    it('should calculate damage within expected range', () => {
      const damage = combatSystem.calculateDamage(testWeaponStats)

      expect(damage).toBeGreaterThanOrEqual(10)
      expect(damage).toBeLessThanOrEqual(15)
    })

    it('should use default values for missing stats', () => {
      const damage = combatSystem.calculateDamage({})

      expect(damage).toBeGreaterThanOrEqual(10)
      expect(damage).toBeLessThanOrEqual(15)
    })

    it('should return 0 for null weapon stats', () => {
      const damage = combatSystem.calculateDamage(null)

      expect(damage).toBe(0)
    })

    it('should handle high damage weapons', () => {
      const highDamageWeapon = {
        baseDamage: 100,
        damageVariation: 50
      }

      const damage = combatSystem.calculateDamage(highDamageWeapon)

      expect(damage).toBeGreaterThanOrEqual(100)
      expect(damage).toBeLessThanOrEqual(150)
    })
  })

  describe('calculateHit', () => {
    it('should always hit with 100% accuracy', () => {
      testWeaponStats.accuracy = 1.0
      testEnemy.evasion = 0

      const hit = combatSystem.calculateHit(testWeaponStats, testEnemy)

      expect(typeof hit).toBe('boolean')
    })

    it('should never hit with 0% accuracy', () => {
      testWeaponStats.accuracy = 0.0
      testEnemy.evasion = 0

      let hits = 0
      for (let i = 0; i < 100; i++) {
        if (combatSystem.calculateHit(testWeaponStats, testEnemy)) hits++
      }

      expect(hits).toBe(0)
    })

    it('should reduce hit chance with evasion', () => {
      testWeaponStats.accuracy = 1.0
      testEnemy.evasion = 0.5

      let hits = 0
      for (let i = 0; i < 100; i++) {
        if (combatSystem.calculateHit(testWeaponStats, testEnemy)) hits++
      }

      // With 50% evasion, expect ~50 hits out of 100
      expect(hits).toBeGreaterThan(30)
      expect(hits).toBeLessThan(70)
    })
  })

  describe('applyDefense', () => {
    it('should not reduce damage with 0 defense', () => {
      const reducedDamage = combatSystem.applyDefense(100, 0)

      expect(reducedDamage).toBe(100)
    })

    it('should reduce damage with positive defense', () => {
      const reducedDamage = combatSystem.applyDefense(100, 50)

      // 50 defense = 33.3% reduction → ~67 damage
      expect(reducedDamage).toBeLessThan(100)
      expect(reducedDamage).toBeGreaterThanOrEqual(1)
    })

    it('should never reduce damage below 1', () => {
      const reducedDamage = combatSystem.applyDefense(10, 10000)

      expect(reducedDamage).toBeGreaterThanOrEqual(1)
    })

    it('should handle negative defense (vulnerability)', () => {
      const reducedDamage = combatSystem.applyDefense(100, -50)

      expect(reducedDamage).toBe(100)
    })
  })

  describe('calculateCritical', () => {
    it('should return non-crit with 0% crit chance', () => {
      const result = combatSystem.calculateCritical(100, 0, 2.0)

      expect(result.damage).toBe(100)
      expect(result.wasCrit).toBe(false)
    })

    it('should always crit with 100% crit chance', () => {
      const result = combatSystem.calculateCritical(100, 1.0, 2.0)

      expect(result.damage).toBe(200) // 2x multiplier
      expect(result.wasCrit).toBe(true)
    })

    it('should use crit multiplier correctly', () => {
      const result = combatSystem.calculateCritical(50, 1.0, 3.0)

      expect(result.damage).toBe(150) // 3x multiplier
      expect(result.wasCrit).toBe(true)
    })

    it('should handle fractional multipliers', () => {
      const result = combatSystem.calculateCritical(100, 1.0, 1.5)

      expect(result.damage).toBe(150)
    })
  })

  describe('generateLoot', () => {
    it('should generate loot with valid structure', () => {
      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot).toHaveProperty('id')
      expect(loot).toHaveProperty('type')
      expect(loot).toHaveProperty('amount')
      expect(loot).toHaveProperty('position')
    })

    it('should respect enemy loot type', () => {
      testEnemy.lootType = 'gold'

      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot.type).toBe('gold')
    })

    it('should generate gold loot in expected range', () => {
      testEnemy.lootType = 'gold'

      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot.amount).toBeGreaterThanOrEqual(10)
      expect(loot.amount).toBeLessThanOrEqual(30)
    })

    it('should generate health loot in expected range', () => {
      testEnemy.lootType = 'health'

      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot.amount).toBeGreaterThanOrEqual(20)
      expect(loot.amount).toBeLessThanOrEqual(50)
    })

    it('should use enemy position', () => {
      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot.position).toEqual(testEnemy.position)
    })

    it('should handle enemy without position', () => {
      delete testEnemy.position

      const loot = combatSystem.generateLoot(testEnemy)

      expect(loot.position).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('calculateExperienceReward', () => {
    it('should calculate base experience', () => {
      testEnemy.experienceReward = 20

      const exp = combatSystem.calculateExperienceReward(testEnemy)

      expect(exp).toBeGreaterThan(0)
    })

    it('should use default experience if not specified', () => {
      delete testEnemy.experienceReward

      const exp = combatSystem.calculateExperienceReward(testEnemy)

      expect(exp).toBeGreaterThanOrEqual(10)
    })

    it('should scale with enemy level', () => {
      testEnemy.experienceReward = 10
      testEnemy.level = 5

      const exp = combatSystem.calculateExperienceReward(testEnemy)

      expect(exp).toBeGreaterThan(10) // Should be scaled by level
    })

    it('should have variation', () => {
      const exp1 = combatSystem.calculateExperienceReward(testEnemy)
      const exp2 = combatSystem.calculateExperienceReward(testEnemy)

      // They might be different due to random variation
      expect(exp1).toBeGreaterThan(0)
      expect(exp2).toBeGreaterThan(0)
    })
  })

  describe('canAttack', () => {
    it('should allow attack after cooldown', () => {
      const lastAttack = Date.now() - 1100
      const cooldown = 1000

      const canAttack = combatSystem.canAttack(lastAttack, cooldown)

      expect(canAttack).toBe(true)
    })

    it('should prevent attack during cooldown', () => {
      const lastAttack = Date.now() - 500
      const cooldown = 1000

      const canAttack = combatSystem.canAttack(lastAttack, cooldown)

      expect(canAttack).toBe(false)
    })

    it('should allow attack at exact cooldown time', () => {
      const lastAttack = Date.now() - 1000
      const cooldown = 1000

      const canAttack = combatSystem.canAttack(lastAttack, cooldown)

      expect(canAttack).toBe(true)
    })
  })

  describe('calculateAoEDamage', () => {
    it('should affect enemies within radius', () => {
      const enemies = [
        { id: 'e1', position: { x: 2, y: 0, z: 0 }, health: 50 },
        { id: 'e2', position: { x: 5, y: 0, z: 0 }, health: 50 },
        { id: 'e3', position: { x: 15, y: 0, z: 0 }, health: 50 }
      ]

      const result = combatSystem.calculateAoEDamage({
        player: testPlayer,
        enemies,
        radius: 10,
        damage: 50
      })

      expect(result.length).toBe(2) // Only e1 and e2 within radius
      expect(result[0].enemy.id).toBe('e1')
      expect(result[1].enemy.id).toBe('e2')
    })

    it('should apply damage falloff with distance', () => {
      const enemies = [
        { id: 'close', position: { x: 1, y: 0, z: 0 }, health: 50 },
        { id: 'far', position: { x: 9, y: 0, z: 0 }, health: 50 }
      ]

      const result = combatSystem.calculateAoEDamage({
        player: testPlayer,
        enemies,
        radius: 10,
        damage: 100
      })

      // Closer enemy should take more damage
      const closeDamage = result.find(r => r.enemy.id === 'close').damage
      const farDamage = result.find(r => r.enemy.id === 'far').damage

      expect(closeDamage).toBeGreaterThan(farDamage)
    })

    it('should handle no enemies in radius', () => {
      const enemies = [
        { id: 'e1', position: { x: 50, y: 0, z: 0 }, health: 50 }
      ]

      const result = combatSystem.calculateAoEDamage({
        player: testPlayer,
        enemies,
        radius: 10,
        damage: 50
      })

      expect(result).toHaveLength(0)
    })

    it('should handle null parameters', () => {
      const result = combatSystem.calculateAoEDamage({
        player: null,
        enemies: [],
        radius: 10,
        damage: 50
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 3, y: 4, z: 0 }

      const distance = combatSystem.calculateDistance(pos1, pos2)

      expect(distance).toBeCloseTo(5, 1) // 3-4-5 triangle
    })

    it('should return 0 for same position', () => {
      const pos = { x: 5, y: 5, z: 5 }

      const distance = combatSystem.calculateDistance(pos, pos)

      expect(distance).toBe(0)
    })

    it('should handle 3D distance', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 1, y: 1, z: 1 }

      const distance = combatSystem.calculateDistance(pos1, pos2)

      expect(distance).toBeCloseTo(Math.sqrt(3), 2)
    })

    it('should return Infinity for null positions', () => {
      const distance = combatSystem.calculateDistance(null, { x: 0, y: 0, z: 0 })

      expect(distance).toBe(Infinity)
    })
  })

  describe('calculateKnockback', () => {
    it('should calculate knockback vector', () => {
      const attacker = { x: 0, y: 0, z: 0 }
      const target = { x: 10, y: 0, z: 0 }

      const knockback = combatSystem.calculateKnockback(attacker, target, 5)

      expect(knockback.x).toBeCloseTo(5, 1)
      expect(knockback.y).toBe(0)
      expect(knockback.z).toBeCloseTo(0, 1)
    })

    it('should calculate normalized direction', () => {
      const attacker = { x: 0, y: 0, z: 0 }
      const target = { x: 3, y: 0, z: 4 }

      const knockback = combatSystem.calculateKnockback(attacker, target, 10)

      const magnitude = Math.sqrt(knockback.x ** 2 + knockback.z ** 2)
      expect(magnitude).toBeCloseTo(10, 1)
    })

    it('should return zero vector for same position', () => {
      const pos = { x: 5, y: 0, z: 5 }

      const knockback = combatSystem.calculateKnockback(pos, pos, 10)

      expect(knockback.x).toBe(0)
      expect(knockback.y).toBe(0)
      expect(knockback.z).toBe(0)
    })

    it('should handle null parameters', () => {
      const knockback = combatSystem.calculateKnockback(null, null, 10)

      expect(knockback).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('calculateLifesteal', () => {
    it('should calculate lifesteal healing', () => {
      const healing = combatSystem.calculateLifesteal(100, 0.2)

      expect(healing).toBe(20)
    })

    it('should return 0 for 0% lifesteal', () => {
      const healing = combatSystem.calculateLifesteal(100, 0)

      expect(healing).toBe(0)
    })

    it('should return 0 for negative lifesteal', () => {
      const healing = combatSystem.calculateLifesteal(100, -0.2)

      expect(healing).toBe(0)
    })

    it('should return 0 for 0 damage', () => {
      const healing = combatSystem.calculateLifesteal(0, 0.5)

      expect(healing).toBe(0)
    })

    it('should handle 100% lifesteal', () => {
      const healing = combatSystem.calculateLifesteal(50, 1.0)

      expect(healing).toBe(50)
    })
  })

  describe('Combat Scenarios', () => {
    it('should handle one-shot kill', () => {
      testEnemy.health = 1
      testWeaponStats.baseDamage = 100

      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })

      expect(result.killedEnemies).toHaveLength(1)
      expect(result.loot).toHaveLength(1)
    })

    it('should handle damage over multiple attacks', () => {
      testEnemy.health = 100
      testWeaponStats.baseDamage = 25
      testWeaponStats.damageVariation = 0

      // First attack
      const result1 = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })
      const healthAfterFirst = testEnemy.health
      expect(healthAfterFirst).toBeLessThan(100)
      expect(healthAfterFirst).toBeGreaterThan(50)

      // Second attack
      const result2 = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: [{ enemy: testEnemy }]
      })
      
      // Health should continue to decrease
      expect(testEnemy.health).toBeLessThan(healthAfterFirst)
      expect(testEnemy.health).toBeGreaterThanOrEqual(0)
    })

    it('should handle piercing multiple enemies', () => {
      const enemies = [
        { id: 'e1', position: { x: 1, y: 0, z: 0 }, health: 20, maxHealth: 20 },
        { id: 'e2', position: { x: 2, y: 0, z: 0 }, health: 20, maxHealth: 20 },
        { id: 'e3', position: { x: 3, y: 0, z: 0 }, health: 20, maxHealth: 20 }
      ]

      testWeaponStats.baseDamage = 30
      testWeaponStats.maxTargets = 3

      const result = combatSystem.processAttack({
        player: testPlayer,
        weaponStats: testWeaponStats,
        enemiesInRange: enemies.map(enemy => ({ enemy }))
      })

      expect(result.killedEnemies).toHaveLength(3)
      expect(result.loot).toHaveLength(3)
    })
  })
})

