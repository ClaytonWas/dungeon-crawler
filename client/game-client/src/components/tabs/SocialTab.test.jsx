import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SocialTab from './SocialTab'

vi.mock('../../stores/gameStore', () => {
  return {
    useGameStore: vi.fn()
  }
})
import { useGameStore } from '../../stores/gameStore'
describe('SocialTab - party controls', () => {
  beforeEach(() => {
    useGameStore.mockReset()
  })

  it('shows Create/Join buttons when not in a party', () => {
    useGameStore.mockReturnValue({
      socket: null,
      partyId: null,
      partyMembers: [],
      partyLeaderId: null,
      playerId: 'player1',
      messages: [],
      inHubWorld: true,
      inDungeon: false
    })

    render(<SocialTab />)

    expect(screen.getByText('Create Party')).toBeInTheDocument()
    expect(screen.getByText('Join Party')).toBeInTheDocument()
    expect(screen.queryByText('Start Dungeon')).not.toBeInTheDocument()
  })

  it('shows Start Dungeon enabled for party leader', () => {
    const emit = vi.fn()

    useGameStore.mockReturnValue({
      socket: { emit },
      partyId: 'party123',
      partyMembers: [{ id: 'player1', username: 'Leader' }],
      partyLeaderId: 'player1',
      playerId: 'player1',
      messages: [],
      inHubWorld: true,
      inDungeon: false
    })

    render(<SocialTab />)

    const startButton = screen.getByText('Start Dungeon')
    expect(startButton).toBeInTheDocument()
    expect(startButton).not.toBeDisabled()

    fireEvent.click(startButton)
    expect(emit).toHaveBeenCalledWith('startDungeon')
  })

  it('sends chat message and clears input on submit', () => {
    const emit = vi.fn()

    useGameStore.mockReturnValue({
      socket: { emit },
      partyId: null,
      partyMembers: [],
      partyLeaderId: null,
      playerId: 'player1',
      messages: [],
      inHubWorld: true,
      inDungeon: false
    })

    render(<SocialTab />)

    const input = screen.getByPlaceholderText('Type a message...')
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: 'Hello world' } })
    expect(input).toHaveValue('Hello world')

    fireEvent.submit(form)

    expect(emit).toHaveBeenCalledWith('sendGlobalUserMessage', 'Hello world')
    expect(input).toHaveValue('')
  })

  it('shows Start Dungeon disabled for non-leader', () => {
    const emit = vi.fn()

    useGameStore.mockReturnValue({
      socket: { emit },
      partyId: 'party123',
      partyMembers: [
        { id: 'leader', username: 'Leader' },
        { id: 'player2', username: 'Member' }
      ],
      partyLeaderId: 'leader',
      playerId: 'player2',
      messages: [],
      inHubWorld: true,
      inDungeon: false
    })

    render(<SocialTab />)

    const startButton = screen.getByText('Start Dungeon')
    expect(startButton).toBeInTheDocument()
    expect(startButton).toBeDisabled()
  })
})


