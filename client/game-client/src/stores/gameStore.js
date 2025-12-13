import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // Connection state
  socket: null,
  connected: false,
  playerId: null,
  
  // Player state
  players: {},
  localPlayer: null,
  
  // Character management
  characters: [],
  currentCharacterId: null,
  
  // Party state
  partyId: null,
  partyMembers: [],
  partyLeaderId: null,
  
  // Game state
  inHubWorld: true,
  inDungeon: false,
  enemies: [],
  loot: [],
  
  // Chat - separate channels
  globalMessages: [],
  partyMessages: [],
  activeChatTab: 'global', // 'global' | 'party' | future: 'friends'
  
  // Character stats
  characterStats: null,
  weaponStats: null,
  
  // Combat visuals
  targetedEnemies: [],
  damageNumbers: [],
  
  // Chat bubbles (playerId -> { message, timestamp })
  chatBubbles: {},
  
  // UI state
  panelCollapsed: false,
  
  // Force position reset (for scene transitions)
  forcePosition: null,
  
  // Actions
  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
  setPlayerId: (playerId) => set({ playerId }),
  
  setPlayers: (players) => set({ players }),
  updatePlayer: (playerId, data) => set((state) => ({
    players: { ...state.players, [playerId]: { ...state.players[playerId], ...data } }
  })),
  removePlayer: (playerId) => set((state) => {
    const { [playerId]: removed, ...rest } = state.players
    return { players: rest }
  }),
  clearPlayers: () => set({ players: {} }),
  
  setCharacters: (characters) => set({ characters }),
  setCurrentCharacterId: (id) => set({ currentCharacterId: id }),
  
  setParty: (partyId, members, leaderId) => set({ 
    partyId, 
    partyMembers: members, 
    partyLeaderId: leaderId 
  }),
  clearParty: () => set({ partyId: null, partyMembers: [], partyLeaderId: null }),
  
  setInHubWorld: (inHubWorld) => set({ inHubWorld, inDungeon: !inHubWorld }),
  setInDungeon: (inDungeon) => set({ inDungeon, inHubWorld: !inDungeon }),
  setForcePosition: (position) => set({ forcePosition: position }),
  clearForcePosition: () => set({ forcePosition: null }),
  
  setEnemies: (enemies) => set({ enemies }),
  updateEnemy: (enemyId, data) => set((state) => ({
    enemies: state.enemies.map(e => e.id === enemyId ? { ...e, ...data } : e)
  })),
  removeEnemy: (enemyId) => set((state) => ({
    enemies: state.enemies.filter(e => e.id !== enemyId)
  })),
  
  setLoot: (loot) => set({ loot }),
  addLoot: (item) => set((state) => ({ loot: [...state.loot, item] })),
  removeLoot: (lootId) => set((state) => ({
    loot: state.loot.filter(l => l.id !== lootId)
  })),
  
  addGlobalMessage: (message) => set((state) => ({
    globalMessages: [...state.globalMessages.slice(-99), message]
  })),
  addPartyMessage: (message) => set((state) => ({
    partyMessages: [...state.partyMessages.slice(-99), message]
  })),
  clearPartyMessages: () => set({ partyMessages: [] }),
  setActiveChatTab: (tab) => set({ activeChatTab: tab }),
  
  setCharacterStats: (stats) => set({ characterStats: stats }),
  setWeaponStats: (stats) => set({ weaponStats: stats }),
  
  setTargetedEnemies: (enemies) => set({ targetedEnemies: enemies }),
  addDamageNumber: (damage) => set((state) => ({
    damageNumbers: [...state.damageNumbers, { ...damage, id: Date.now() + Math.random() }]
  })),
  removeDamageNumber: (id) => set((state) => ({
    damageNumbers: state.damageNumbers.filter(d => d.id !== id)
  })),
  clearDamageNumbers: () => set({ damageNumbers: [] }),
  
  addChatBubble: (playerId, message) => set((state) => ({
    chatBubbles: { ...state.chatBubbles, [playerId]: { message, timestamp: Date.now() } }
  })),
  removeChatBubble: (playerId) => set((state) => {
    const { [playerId]: removed, ...rest } = state.chatBubbles
    return { chatBubbles: rest }
  }),
  
  setPanelCollapsed: (collapsed) => set({ panelCollapsed: collapsed }),
}))

