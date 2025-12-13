/**
 * COMBAT SYSTEM
 * 
 * Core combat mechanics for Vampire Survivors-style auto-attack system.
 * Handles damage application, enemy deaths, loot spawning, and experience rewards.
 */

class CombatSystem {
    constructor() {
        this.deps = null
    }

    /**
     * Inject runtime dependencies (maps, managers, etc.)
     * @param {Object} deps
     */
    configure(deps = {}) {
        this.deps = deps
    }

    getContext() {
        if (!this.deps) {
            throw new Error('CombatSystem not configured with dependencies')
        }
        return this.deps
    }
    /**
     * Handle full auto-attack loop for a player socket
     * @param {Object} socket - Player socket
     */
    autoAttack(socket) {
        if (!socket) return

        const {
            playersInServer,
            playerToRoom,
            dungeonRooms,
            parties,
            weaponSystem,
            characterUpgrades,
            characterManager,
            hubWorldPlayers,
            playerMonitor
        } = this.getContext()

        const roomId = playerToRoom.get(socket)
        if (!roomId) return

        const room = dungeonRooms.get(roomId)
        if (!room) return

        const player = playersInServer.get(socket.user.id)
        if (!player) return

        const weaponStats = weaponSystem.getWeaponStats(player)
        if (!weaponStats) return

        const now = Date.now()
        const lastAttackTime = player.lastAttackTime ?? weaponStats.lastAttackTime ?? 0
        if (!this.canAttack(lastAttackTime, weaponStats.attackCooldown)) {
            return
        }

        const enemiesInRange = weaponSystem.findEnemiesInRadius(player, room)
        if (enemiesInRange.length === 0) {
            return
        }

        const attackResult = this.processAttack({
            player,
            weaponStats,
            enemiesInRange
        })

        if (!attackResult || attackResult.attackedEnemies.length === 0) {
            return
        }

        player.lastAttackTime = now

        const party = parties.get(room.partyId)
        const handleExperienceGain = (expGain) => {
            this.handleExperienceGain({
                player,
                socket,
                expGain,
                characterUpgrades,
                characterManager
            })
        }

        if (attackResult.killedEnemies.length > 0) {
            room.loot = room.loot || []

            attackResult.killedEnemies.forEach(({ enemy, loot, experience }) => {
                room.enemies = room.enemies.filter(e => e.id !== enemy.id)

                if (loot) {
                    room.loot.push(loot)
                }

                handleExperienceGain(experience || 0)

                if (party) {
                    party.members.forEach(member => {
                        member.emit('enemyKilled', {
                            enemyId: enemy.id,
                            loot
                        })
                    })
                }
            })
        }

        if (party && attackResult.attackedEnemies.length > 0) {
            const targetedEnemyIds = enemiesInRange.map(({ enemy }) => enemy.id)

            party.members.forEach(member => {
                member.emit('enemyDamaged', {
                    attacks: attackResult.attackedEnemies,
                    playerId: socket.user.id
                })

                if (member === socket) {
                    member.emit('enemiesTargeted', {
                        enemyIds: targetedEnemyIds,
                        attackRadius: weaponStats.attackRadius
                    })
                }
            })
        }

        if (room.enemies.length === 0 && !room.cleared) {
            this.handleRoomCleared({
                room,
                roomId,
                party,
                parties,
                playerToRoom,
                hubWorldPlayers,
                playerMonitor,
                playersInServer,
                dungeonRooms
            })
        }
    }

    /**
     * Handle legacy manual attack
     * @param {Object} socket - Player socket
     * @param {String} enemyId - Target enemy ID
     * @returns {Object} Result payload
     */
    attackEnemy(socket, enemyId) {
        const {
            playerToRoom,
            dungeonRooms,
            weaponSystem,
            parties,
            characterUpgrades,
            characterManager,
            playersInServer
        } = this.getContext()

        const roomId = playerToRoom.get(socket)
        if (!roomId) return { success: false, message: 'Not in a dungeon room' }

        const room = dungeonRooms.get(roomId)
        if (!room) return { success: false, message: 'Room not found' }

        const enemy = room.enemies.find(e => e.id === enemyId)
        if (!enemy) return { success: false, message: 'Enemy not found' }

        const player = playersInServer.get(socket.user.id)
        if (!player) return { success: false, message: 'Player not found' }

        const weaponStats = weaponSystem.getWeaponStats(player)
        if (!weaponStats) return { success: false, message: 'Weapon stats not found' }

        const damage = this.calculateDamage(weaponStats)
        enemy.health -= damage

        const party = parties.get(room.partyId)
        if (party) {
            party.members.forEach(member => {
                member.emit('enemyDamaged', {
                    attacks: [{
                        enemyId: enemyId,
                        damage: damage,
                        health: enemy.health,
                        maxHealth: enemy.maxHealth
                    }],
                    playerId: socket.user.id
                })
            })
        }

        if (enemy.health <= 0) {
            enemy.health = 0
            room.enemies = room.enemies.filter(e => e.id !== enemyId)

            const loot = this.generateLoot(enemy)
            room.loot = room.loot || []
            room.loot.push(loot)

            const expGain = this.calculateExperienceReward(enemy)
            this.handleExperienceGain({
                player,
                socket,
                expGain,
                characterUpgrades,
                characterManager
            })

            if (party) {
                party.members.forEach(member => {
                    member.emit('enemyKilled', {
                        enemyId: enemy.id,
                        loot
                    })
                })
            }
        }

        return { success: true, damage, enemy }
    }

    /**
     * Handle enemy attacking a player
     * @param {Object} enemy - Enemy object
     * @param {Object} targetSocket - Target player's socket
     */
    enemyAttackPlayer(enemy, targetSocket) {
        if (!enemy || !targetSocket) return

        const {
            playersInServer,
            playerToParty,
            parties
        } = this.getContext()

        const player = playersInServer.get(targetSocket.user.id)
        if (!player) return

        const damage = 5 + Math.floor(Math.random() * 5)
        player.health = Math.max(0, (player.health || 100) - damage)

        const partyId = playerToParty.get(targetSocket)
        if (partyId) {
            const party = parties.get(partyId)
            if (party) {
                party.members.forEach(member => {
                    member.emit('playerDamaged', {
                        playerId: targetSocket.user.id,
                        damage,
                        health: player.health,
                        maxHealth: player.maxHealth || 100
                    })
                })
            }
        }

        if (player.health <= 0) {
            player.health = 0
            targetSocket.emit('playerDied')
        }
    }

    /**
     * Apply experience rewards (in-match + persistent)
     * @param {Object} params
     */
    handleExperienceGain({ player, socket, expGain, characterUpgrades, characterManager }) {
        if (!player || !expGain || expGain <= 0) return

        const levelUpResult = characterUpgrades?.addExperience(player, expGain)
        if (levelUpResult?.leveledUp) {
            socket?.emit('levelUp', { newLevel: levelUpResult.newLevel })
        }

        if (characterManager && socket?.user?.id && player.characterId) {
            const charResult = characterManager.addExperience(socket.user.id, player.characterId, expGain)
            if (charResult?.character) {
                if (charResult.leveledUp) {
                    player.maxHealth = charResult.character.baseMaxHealth
                    player.health = Math.min(player.health, player.maxHealth)
                    player.maxMana = charResult.character.baseMaxMana
                    player.mana = Math.min(player.mana, player.maxMana)
                    player.defense = charResult.character.baseDefense
                }

                characterManager.updateCharacter(socket.user.id, player.characterId, {
                    totalKills: (charResult.character.totalKills || 0) + 1
                })
            }
        }
    }

    /**
     * Handle returning party to hub when room is cleared
     * @param {Object} params
     */
    handleRoomCleared({ room, roomId, party, parties, playerToRoom, hubWorldPlayers, playerMonitor, playersInServer, dungeonRooms }) {
        if (!room || room.cleared) return
        room.cleared = true

        if (!party) return

        party.members.forEach(member => {
            member.emit('roomCleared', { roomId })
        })

        party.members.forEach(member => {
            playerToRoom.delete(member)
            hubWorldPlayers.add(member)

            const player = playersInServer.get(member.user.id)
            if (player) {
                // Restore saved hub position or use origin as fallback
                if (player.savedHubPosition) {
                    player.position = { ...player.savedHubPosition }
                    console.log(`[DUNGEON] Restored hub position for ${member.user.username}:`, player.position)
                    delete player.savedHubPosition // Clean up
                } else {
                    player.position = { x: 0, y: 0.5, z: 0 }
                }
            }

            member.emit('returnToHubWorld', { cleared: true, position: player?.position })
            playerMonitor?.sendAreaState(member)

            const playerData = playerMonitor?.getPlayerData(member)
            if (playerData) {
                hubWorldPlayers.forEach(hubSocket => {
                    if (hubSocket !== member) {
                        hubSocket.emit('playerJoined', playerData)
                    }
                })
            }
        })

        dungeonRooms.delete(roomId)
        party.roomId = null
        parties.set(room.partyId, party)

        console.log(`[DUNGEON] Room ${roomId} cleared, party returned to hub`)
    }

    /**
     * Process an attack on multiple enemies
     * @param {Object} params - Attack parameters
     * @param {Object} params.player - Player object
     * @param {Object} params.weaponStats - Weapon stats from weaponSystem
     * @param {Array} params.enemiesInRange - Array of enemy objects
     * @returns {Object} Attack results
     */
    processAttack({ player, weaponStats, enemiesInRange }) {
        if (!player || !weaponStats || !enemiesInRange || enemiesInRange.length === 0) {
            return {
                attackedEnemies: [],
                killedEnemies: [],
                loot: [],
                experienceGained: 0
            }
        }

        const attackedEnemies = []
        const killedEnemies = []
        const loot = []
        let experienceGained = 0

        // Apply damage to each enemy in range (up to maxTargets)
        enemiesInRange.forEach(({ enemy }) => {
            const damage = this.calculateDamage(weaponStats)
            enemy.health -= damage

            attackedEnemies.push({
                enemyId: enemy.id,
                damage: damage,
                health: Math.max(0, enemy.health),
                maxHealth: enemy.maxHealth
            })

            // Check if enemy is dead
            if (enemy.health <= 0) {
                enemy.health = 0
                const lootDrop = this.generateLoot(enemy)
                loot.push(lootDrop)

                const exp = this.calculateExperienceReward(enemy)
                experienceGained += exp

                killedEnemies.push({
                    enemy,
                    loot: lootDrop,
                    experience: exp
                })
            }
        })

        return {
            attackedEnemies,
            killedEnemies,
            loot,
            experienceGained
        }
    }

    /**
     * Calculate damage based on weapon stats
     * @param {Object} weaponStats - Weapon stats
     * @returns {Number} Damage amount
     */
    calculateDamage(weaponStats) {
        if (!weaponStats) return 0

        const baseDamage = weaponStats.baseDamage || 10
        const variation = weaponStats.damageVariation || 5

        return baseDamage + Math.floor(Math.random() * variation)
    }

    /**
     * Calculate if attack hits based on accuracy
     * @param {Object} weaponStats - Weapon stats
     * @param {Object} enemy - Enemy object
     * @returns {Boolean} Hit or miss
     */
    calculateHit(weaponStats, enemy) {
        const accuracy = weaponStats.accuracy ?? 1.0
        const evasion = enemy.evasion ?? 0.0

        const hitChance = Math.max(0, Math.min(1, accuracy - evasion))
        return Math.random() < hitChance
    }

    /**
     * Apply defense/armor reduction to damage
     * @param {Number} rawDamage - Raw damage before defense
     * @param {Number} defense - Defense/armor value
     * @returns {Number} Reduced damage
     */
    applyDefense(rawDamage, defense = 0) {
        if (defense <= 0) return rawDamage

        // Simple defense formula: reduce damage by percentage
        // defense / (defense + 100) = damage reduction
        // e.g., 50 defense = 33% reduction, 100 defense = 50% reduction
        const reduction = defense / (defense + 100)
        return Math.max(1, Math.floor(rawDamage * (1 - reduction)))
    }

    /**
     * Calculate critical hit
     * @param {Number} baseDamage - Base damage
     * @param {Number} critChance - Critical hit chance (0-1)
     * @param {Number} critMultiplier - Critical damage multiplier
     * @returns {Object} { damage, wasCrit }
     */
    calculateCritical(baseDamage, critChance = 0.1, critMultiplier = 2.0) {
        const wasCrit = Math.random() < critChance

        return {
            damage: wasCrit ? Math.floor(baseDamage * critMultiplier) : baseDamage,
            wasCrit
        }
    }

    /**
     * Generate loot drop from enemy
     * @param {Object} enemy - Enemy object
     * @returns {Object} Loot object
     */
    generateLoot(enemy) {
        const lootTypes = ['gold', 'health', 'mana']
        const type = enemy.lootType || lootTypes[Math.floor(Math.random() * lootTypes.length)]

        let amount
        switch (type) {
            case 'gold':
                amount = Math.floor(Math.random() * 20) + 10 // 10-30 gold
                break
            case 'health':
                amount = Math.floor(Math.random() * 30) + 20 // 20-50 health
                break
            case 'mana':
                amount = Math.floor(Math.random() * 20) + 10 // 10-30 mana
                break
            default:
                amount = 10
        }

        return {
            id: `loot_${Date.now()}_${Math.random()}`,
            enemyId: enemy.id,
            type,
            amount,
            position: enemy.position || { x: 0, y: 0, z: 0 }
        }
    }

    /**
     * Calculate experience reward for killing enemy
     * @param {Object} enemy - Enemy object
     * @returns {Number} Experience points
     */
    calculateExperienceReward(enemy) {
        // Base exp based on enemy level or difficulty
        const baseExp = enemy.experienceReward || 10
        const levelMultiplier = enemy.level || 1

        // Random variation: ±50%
        const variation = Math.floor(Math.random() * (baseExp * 0.5))

        return Math.floor(baseExp * levelMultiplier + variation)
    }

    /**
     * Check if attack is on cooldown
     * @param {Number} lastAttackTime - Last attack timestamp
     * @param {Number} cooldown - Attack cooldown in ms
     * @returns {Boolean} Can attack
     */
    canAttack(lastAttackTime, cooldown) {
        const now = Date.now()
        return now - lastAttackTime >= cooldown
    }

    /**
     * Calculate area of effect damage
     * @param {Object} params - AoE parameters
     * @param {Object} params.player - Player object
     * @param {Array} params.enemies - All enemies in room
     * @param {Number} params.radius - AoE radius
     * @param {Number} params.damage - Base damage
     * @returns {Array} Affected enemies with damage
     */
    calculateAoEDamage({ player, enemies, radius, damage }) {
        if (!player || !enemies || !radius || !damage) return []

        const affected = []

        enemies.forEach(enemy => {
            const distance = this.calculateDistance(player.position, enemy.position)

            if (distance <= radius) {
                // Damage falls off with distance (optional)
                const falloff = 1 - (distance / radius) * 0.5 // 50% falloff at edge
                const finalDamage = Math.floor(damage * falloff)

                affected.push({
                    enemy,
                    damage: finalDamage,
                    distance
                })
            }
        })

        return affected
    }

    /**
     * Calculate distance between two points
     * @param {Object} pos1 - First position {x, y, z}
     * @param {Object} pos2 - Second position {x, y, z}
     * @returns {Number} Distance
     */
    calculateDistance(pos1, pos2) {
        if (!pos1 || !pos2) return Infinity

        const dx = (pos1.x || 0) - (pos2.x || 0)
        const dy = (pos1.y || 0) - (pos2.y || 0)
        const dz = (pos1.z || 0) - (pos2.z || 0)

        return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }

    /**
     * Calculate knockback from attack
     * @param {Object} attackerPos - Attacker position
     * @param {Object} targetPos - Target position
     * @param {Number} force - Knockback force
     * @returns {Object} Knockback vector {x, y, z}
     */
    calculateKnockback(attackerPos, targetPos, force) {
        if (!attackerPos || !targetPos || !force) {
            return { x: 0, y: 0, z: 0 }
        }

        const dx = targetPos.x - attackerPos.x
        const dz = targetPos.z - attackerPos.z
        const distance = Math.sqrt(dx * dx + dz * dz)

        if (distance === 0) return { x: 0, y: 0, z: 0 }

        const normalizedX = dx / distance
        const normalizedZ = dz / distance

        return {
            x: normalizedX * force,
            y: 0,
            z: normalizedZ * force
        }
    }

    /**
     * Apply lifesteal healing
     * @param {Number} damage - Damage dealt
     * @param {Number} lifestealPercent - Lifesteal percentage (0-1)
     * @returns {Number} Healing amount
     */
    calculateLifesteal(damage, lifestealPercent = 0) {
        if (lifestealPercent <= 0 || damage <= 0) return 0

        return Math.floor(damage * lifestealPercent)
    }
}

module.exports = new CombatSystem()

