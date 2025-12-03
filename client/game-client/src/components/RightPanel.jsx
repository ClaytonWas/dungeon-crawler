import { useState, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import StatsTab from './tabs/StatsTab'
import SocialTab from './tabs/SocialTab'
import AccountTab from './tabs/AccountTab'

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'social', label: 'Social' },
  { id: 'account', label: 'Account' },
]

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState('stats')
  const { panelCollapsed, setPanelCollapsed } = useGameStore()
  
  const toggleCollapse = (collapsed) => {
    setPanelCollapsed(collapsed)
  }
  
  return (
    <div 
      className={`w-[350px] h-full glass flex flex-col transition-all duration-300 ${
        panelCollapsed ? 'absolute right-0 translate-x-full' : 'relative translate-x-0'
      }`}
      style={{ 
        minWidth: '350px', 
        maxWidth: '350px', 
        zIndex: 100,
        opacity: panelCollapsed ? 0 : 1
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blood/30">
        <h2 className="text-lg font-cinzel font-bold text-crimson tracking-wider">
          Dungeon Crawler
        </h2>
        <button
          onClick={() => toggleCollapse(true)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-blood/30 transition-colors"
          title="Hide Panel"
        >
          ►
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-blood/30">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-crimson border-crimson'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'social' && <SocialTab />}
        {activeTab === 'account' && <AccountTab />}
      </div>
    </div>
  )
}

