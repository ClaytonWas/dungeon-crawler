const weaponSystem = require('../weaponSystem')
const { getWeaponDefinition } = require('../weaponDefinitions')

describe('Weapon System', () => {
  describe('getWeaponStats', () => {
    it('should get weapon stats for a player', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const stats = weaponSystem.getWeaponStats(player)
      
      expect(stats).toHaveProperty('type', 'basic')
      expect(stats).toHaveProperty('attackRadius')
      expect(stats.attackRadius).toBeGreaterThan(0)
      expect(stats.attackCooldown).toBeGreaterThan(0)
    })

    it('should use default weapon type if not specified', () => {
      const player = { position: { x: 0, y: 0, z: 0 } }
      
      const stats = weaponSystem.getWeaponStats(player)
      
      expect(stats.type).toBe('basic')
    })

    it('should return null for invalid player', () => {
      const stats = weaponSystem.getWeaponStats(null)
      
      expect(stats).toBeNull()
    })
  })

  describe('upgradeWeapon', () => {
    it('should upgrade weapon damage correctly', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const initialStats = weaponSystem.getWeaponStats(player)
      const initialDamage = initialStats.baseDamage
      
      const success = weaponSystem.upgradeWeapon(player, 'damage', 5)
      
      expect(success).toBe(true)
      
      const newStats = weaponSystem.getWeaponStats(player)
      expect(newStats.baseDamage).toBeGreaterThan(initialDamage)
    })

    it('should respect max caps on upgrades', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      // Upgrade damage 1000 times (should hit max)
      for (let i = 0; i < 1000; i++) {
        weaponSystem.upgradeWeapon(player, 'damage', 10)
      }
      
      const weaponDef = getWeaponDefinition('basic')
      const stats = weaponSystem.getWeaponStats(player)
      
      expect(stats.baseDamage).toBeLessThanOrEqual(weaponDef.upgradePath.damage.max)
    })

    it('should reduce cooldown on upgrade', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const initialStats = weaponSystem.getWeaponStats(player)
      const initialCooldown = initialStats.attackCooldown
      
      weaponSystem.upgradeWeapon(player, 'cooldown', 50)
      
      const newStats = weaponSystem.getWeaponStats(player)
      expect(newStats.attackCooldown).toBeLessThan(initialCooldown)
    })
  })

  describe('calculateDamage', () => {
    it('should calculate damage within expected range', () => {
      const player = { weaponType: 'basic' }
      const stats = weaponSystem.getWeaponStats(player)
      
      const damage = weaponSystem.calculateDamage(stats)
      
      expect(damage).toBeGreaterThanOrEqual(stats.baseDamage)
      expect(damage).toBeLessThanOrEqual(stats.baseDamage + stats.damageVariation)
    })

    it('should return consistent damage format', () => {
      const player = { weaponType: 'basic' }
      const stats = weaponSystem.getWeaponStats(player)
      
      const damage = weaponSystem.calculateDamage(stats)
      
      expect(typeof damage).toBe('number')
      expect(damage).toBeGreaterThan(0)
    })
  })

  describe('findEnemiesInRadius', () => {
    it('should find enemies within radius', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const room = {
        enemies: [
          { id: '1', position: { x: 2, y: 0, z: 0 }, health: 100 },  // Within range
          { id: '2', position: { x: 20, y: 0, z: 0 }, health: 100 }, // Out of range
          { id: '3', position: { x: 0, y: 0, z: 2 }, health: 100 }   // Within range
        ]
      }
      
      const targets = weaponSystem.findEnemiesInRadius(player, room)
      
      expect(targets.length).toBeGreaterThan(0)
      expect(targets.length).toBeLessThanOrEqual(2)
    })

    it('should respect maxTargets limit', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 },
        maxTargets: 2
      }
      
      const room = {
        enemies: Array.from({ length: 10 }, (_, i) => ({
          id: `enemy${i}`,
          position: { x: i, y: 0, z: 0 },
          health: 100
        }))
      }
      
      const targets = weaponSystem.findEnemiesInRadius(player, room)
      
      expect(targets.length).toBeLessThanOrEqual(2)
    })

    it('should not target dead enemies', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const room = {
        enemies: [
          { id: '1', position: { x: 1, y: 0, z: 0 }, health: 100 },
          { id: '2', position: { x: 2, y: 0, z: 0 }, health: 0 },    // Dead
          { id: '3', position: { x: 3, y: 0, z: 0 }, health: -10 }   // Dead
        ]
      }
      
      const targets = weaponSystem.findEnemiesInRadius(player, room)
      
      expect(targets).toHaveLength(1)
      expect(targets[0].enemy.id).toBe('1')
    })
  })

  describe('changeWeapon', () => {
    it('should change weapon type', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      const success = weaponSystem.changeWeapon(player, 'cone')
      
      expect(success).toBe(true)
      expect(player.weaponType).toBe('cone')
    })

    it('should fallback to basic weapon for invalid type', () => {
      const player = {
        weaponType: 'basic',
        position: { x: 0, y: 0, z: 0 }
      }
      
      // getWeaponDefinition returns basic as fallback for invalid types
      const success = weaponSystem.changeWeapon(player, 'nonexistent')
      
      expect(success).toBe(true)
      expect(player.weaponType).toBe('nonexistent') // Changed but will use basic stats
      
      // Verify it uses basic weapon stats
      const stats = weaponSystem.getWeaponStats(player)
      expect(stats.type).toBe('nonexistent')
      expect(stats).toHaveProperty('attackRadius') // Has valid stats from fallback
    })
  })
})

