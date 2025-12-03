import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsTab from './StatsTab'

vi.mock('../../stores/gameStore', () => {
  return {
    useGameStore: vi.fn()
  }
})
import { useGameStore } from '../../stores/gameStore'

describe('StatsTab', () => {
  beforeEach(() => {
    useGameStore.mockReset()
  })

  it('shows loading messages when stats are not yet available', () => {
    useGameStore.mockReturnValue({
      characterStats: null,
      weaponStats: null
    })

    render(<StatsTab />)

    expect(screen.getByText(/Loading stats.../i)).toBeInTheDocument()
    expect(screen.getByText(/Loading weapon stats.../i)).toBeInTheDocument()
  })

  it('renders character and weapon stats from store', () => {
    useGameStore.mockReturnValue({
      characterStats: {
        level: 5,
        experience: 50,
        experienceToNextLevel: 100,
        health: 80,
        maxHealth: 100,
        mana: 30,
        maxMana: 50,
        defense: 10,
        movementSpeed: 1.2,
        damageMultiplier: 1.5
      },
      weaponStats: {
        weaponType: 'Sword',
        damage: 25,
        attackRadius: 3.5,
        attackCooldown: 800,
        maxTargets: 3
      }
    })

    render(<StatsTab />)

    expect(screen.getByText(/Level/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText(/Experience/i)).toBeInTheDocument()
    expect(screen.getByText('50 / 100')).toBeInTheDocument()

    expect(screen.getByText(/Health/i)).toBeInTheDocument()
    expect(screen.getByText('80 / 100')).toBeInTheDocument()

    expect(screen.getByText(/Mana/i)).toBeInTheDocument()
    expect(screen.getByText('30 / 50')).toBeInTheDocument()

    expect(screen.getByText(/Defense/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    // movementSpeed and damageMultiplier are formatted as percents
    expect(screen.getByText('120%')).toBeInTheDocument()
    expect(screen.getByText('150%')).toBeInTheDocument()

    expect(screen.getByText(/Weapon Stats/i)).toBeInTheDocument()
    expect(screen.getByText('Sword')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('3.5')).toBeInTheDocument()
    expect(screen.getByText('800ms')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})


