import { useGameStore } from '../../stores/gameStore'

// Helper to safely format numbers
const formatPercent = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '100%'
  return `${(value * 100).toFixed(0)}%`
}

const formatNumber = (value, decimals = 0) => {
  if (typeof value !== 'number' || isNaN(value)) return '0'
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
}

export default function StatsTab() {
  const { characterStats, weaponStats } = useGameStore()
  
  return (
    <div className="space-y-6">
      {/* Character Stats */}
      <div className="glass rounded-lg p-4">
        <h3 className="text-crimson font-semibold mb-4 uppercase tracking-wider text-sm">
          Character Stats
        </h3>
        
        {characterStats ? (
          <div className="space-y-3">
            <StatRow label="Level" value={characterStats.level ?? 1} />
            <StatRow 
              label="Experience" 
              value={`${characterStats.experience ?? 0} / ${characterStats.experienceToNextLevel ?? 100}`} 
            />
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blood to-crimson transition-all duration-300"
                style={{ width: `${((characterStats.experience || 0) / (characterStats.experienceToNextLevel || 100)) * 100}%` }}
              />
            </div>
            <StatRow label="Health" value={`${characterStats.health ?? 100} / ${characterStats.maxHealth ?? 100}`} />
            <StatRow label="Mana" value={`${characterStats.mana ?? 50} / ${characterStats.maxMana ?? 50}`} />
            <StatRow label="Defense" value={characterStats.defense ?? 0} />
            <StatRow label="Speed" value={formatPercent(characterStats.movementSpeed)} />
            <StatRow label="Damage" value={formatPercent(characterStats.damageMultiplier)} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading stats...</p>
        )}
      </div>
      
      {/* Weapon Stats */}
      <div className="glass rounded-lg p-4">
        <h3 className="text-crimson font-semibold mb-4 uppercase tracking-wider text-sm">
          Weapon Stats
        </h3>
        
        {weaponStats ? (
          <div className="space-y-3">
            <StatRow label="Type" value={weaponStats.weaponType || 'Basic'} />
            <StatRow label="Damage" value={weaponStats.damage ?? 10} />
            <StatRow label="Attack Radius" value={formatNumber(weaponStats.attackRadius, 1)} />
            <StatRow label="Cooldown" value={`${weaponStats.attackCooldown ?? 1000}ms`} />
            <StatRow label="Pierce" value={weaponStats.maxTargets ?? 1} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading weapon stats...</p>
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value ?? '-'}</span>
    </div>
  )
}

