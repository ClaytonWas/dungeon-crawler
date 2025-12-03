/**
 * WEAPON DEFINITIONS
 * 
 * This file contains all weapon type definitions.
 * To add a new weapon, simply add a new entry to the WEAPONS object.
 * 
 * Each weapon has:
 * - type: unique identifier
 * - name: display name
 * - baseStats: starting stats for this weapon
 * - upgradePath: available upgrades and their effects
 */

const WEAPONS = {
    basic: {
        type: 'basic',
        name: 'Basic Weapon',
        baseStats: {
            attackRadius: 3.0,
            attackCooldown: 1000,
            baseDamage: 10,
            damageVariation: 5,
            maxTargets: 1
        },
        upgradePath: {
            radius: { increment: 0.5, max: 10.0 },
            damage: { increment: 5, max: 100 },
            cooldown: { increment: -50, min: 100 },
            maxTargets: { increment: 1, max: 10 }
        }
    },
    
    fire: {
        type: 'fire',
        name: 'Fire Weapon',
        baseStats: {
            attackRadius: 2.5,
            attackCooldown: 800,
            baseDamage: 12,
            damageVariation: 6,
            maxTargets: 1
        },
        upgradePath: {
            radius: { increment: 0.5, max: 8.0 },
            damage: { increment: 6, max: 120 },
            cooldown: { increment: -40, min: 100 },
            maxTargets: { increment: 1, max: 8 }
        }
    },
    
    ice: {
        type: 'ice',
        name: 'Ice Weapon',
        baseStats: {
            attackRadius: 3.5,
            attackCooldown: 1200,
            baseDamage: 8,
            damageVariation: 4,
            maxTargets: 2 // Starts with piercing
        },
        upgradePath: {
            radius: { increment: 0.5, max: 12.0 },
            damage: { increment: 4, max: 80 },
            cooldown: { increment: -60, min: 100 },
            maxTargets: { increment: 1, max: 12 }
        }
    },
    
    lightning: {
        type: 'lightning',
        name: 'Lightning Weapon',
        baseStats: {
            attackRadius: 4.0,
            attackCooldown: 1500,
            baseDamage: 15,
            damageVariation: 8,
            maxTargets: 3 // Starts with high piercing
        },
        upgradePath: {
            radius: { increment: 0.5, max: 15.0 },
            damage: { increment: 8, max: 150 },
            cooldown: { increment: -75, min: 100 },
            maxTargets: { increment: 1, max: 15 }
        }
    }
}

module.exports = {
    WEAPONS,
    getWeaponDefinition: (weaponType) => {
        return WEAPONS[weaponType] || WEAPONS.basic
    },
    getAllWeaponTypes: () => {
        return Object.keys(WEAPONS)
    }
}

