import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SocialTab from './SocialTab'

vi.mock('../../stores/gameStore', () => {
  return {
    useGameStore: vi.fn()
  }
})
import { useGameStore } from '../../stores/gameStore'

const defaultMockState = {
  socket: null,
  partyId: null,
  partyMembers: [],
  partyLeaderId: null,
  playerId: 'player1',
  globalMessages: [],
  partyMessages: [],
  activeChatTab: 'global',
  setActiveChatTab: vi.fn(),
  inHubWorld: true,
  inDungeon: false
}

describe('SocialTab - party controls', () => {
  beforeEach(() => {
    useGameStore.mockReset()
  })

  it('shows Create/Join buttons when not in a party', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      socket: null,
      partyId: null,
      partyMembers: [],
      partyLeaderId: null,
      playerId: 'player1'
    })

    render(<SocialTab />)

    expect(screen.getByText('Create Party')).toBeInTheDocument()
    expect(screen.getByText('Join Party')).toBeInTheDocument()
    expect(screen.queryByText('Start Dungeon')).not.toBeInTheDocument()
  })

  it('shows Start Dungeon enabled for party leader', () => {
    const emit = vi.fn()

    useGameStore.mockReturnValue({
      ...defaultMockState,
      socket: { emit },
      partyId: 'party123',
      partyMembers: [{ id: 'player1', username: 'Leader' }],
      partyLeaderId: 'player1',
      playerId: 'player1'
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
      ...defaultMockState,
      socket: { emit },
      partyId: null,
      partyMembers: [],
      partyLeaderId: null,
      playerId: 'player1'
    })

    render(<SocialTab />)

    const input = screen.getByPlaceholderText('Global message...')
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
      ...defaultMockState,
      socket: { emit },
      partyId: 'party123',
      partyMembers: [
        { id: 'leader', username: 'Leader' },
        { id: 'player2', username: 'Member' }
      ],
      partyLeaderId: 'leader',
      playerId: 'player2'
    })

    render(<SocialTab />)

    const startButton = screen.getByText('Start Dungeon')
    expect(startButton).toBeInTheDocument()
    expect(startButton).toBeDisabled()
  })
})

describe('SocialTab - chat tabs', () => {
  beforeEach(() => {
    useGameStore.mockReset()
  })

  it('displays Global and Party chat tabs', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState
    })

    render(<SocialTab />)

    // Use more specific selectors for the chat tab buttons (they have emojis)
    expect(screen.getByText(/🌍 Global/)).toBeInTheDocument()
    expect(screen.getByText(/⚔️ Party/)).toBeInTheDocument()
  })

  it('calls setActiveChatTab when clicking Party tab', () => {
    const setActiveChatTab = vi.fn()

    useGameStore.mockReturnValue({
      ...defaultMockState,
      setActiveChatTab
    })

    render(<SocialTab />)

    // Click the Party chat tab (with sword emoji)
    const partyTab = screen.getByText(/⚔️ Party/)
    fireEvent.click(partyTab)

    expect(setActiveChatTab).toHaveBeenCalledWith('party')
  })

  it('calls setActiveChatTab when clicking Global tab', () => {
    const setActiveChatTab = vi.fn()

    useGameStore.mockReturnValue({
      ...defaultMockState,
      activeChatTab: 'party',
      partyId: 'party123',
      setActiveChatTab
    })

    render(<SocialTab />)

    // Click the Global chat tab (with globe emoji)
    const globalTab = screen.getByText(/🌍 Global/)
    fireEvent.click(globalTab)

    expect(setActiveChatTab).toHaveBeenCalledWith('global')
  })

  it('sends party message when on party tab', () => {
    const emit = vi.fn()

    useGameStore.mockReturnValue({
      ...defaultMockState,
      socket: { emit },
      partyId: 'party123',
      activeChatTab: 'party'
    })

    render(<SocialTab />)

    const input = screen.getByPlaceholderText('Party message...')
    const form = input.closest('form')

    fireEvent.change(input, { target: { value: 'Hello party' } })
    fireEvent.submit(form)

    expect(emit).toHaveBeenCalledWith('sendPartyMessage', 'Hello party')
  })

  it('displays global messages when on global tab', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      activeChatTab: 'global',
      globalMessages: [
        { username: 'Player1', message: 'Hello everyone!' },
        { username: 'Player2', message: 'Hi there!' }
      ]
    })

    render(<SocialTab />)

    expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('displays party messages when on party tab', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      partyId: 'party123',
      activeChatTab: 'party',
      partyMessages: [
        { username: 'Leader', message: 'Follow me!' },
        { username: 'Member', message: 'On my way!' }
      ]
    })

    render(<SocialTab />)

    expect(screen.getByText('Follow me!')).toBeInTheDocument()
    expect(screen.getByText('On my way!')).toBeInTheDocument()
  })

  it('shows "Join a party" message when on party tab without party', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      partyId: null,
      activeChatTab: 'party'
    })

    render(<SocialTab />)

    expect(screen.getByText('Join a party to use party chat')).toBeInTheDocument()
  })

  it('disables chat input when on party tab without party', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      partyId: null,
      activeChatTab: 'party'
    })

    render(<SocialTab />)

    const input = screen.getByPlaceholderText('Party message...')
    expect(input).toBeDisabled()
  })

  it('shows unread badge on party tab when there are unread messages', () => {
    useGameStore.mockReturnValue({
      ...defaultMockState,
      activeChatTab: 'global',
      partyMessages: [
        { username: 'Leader', message: 'New message!' }
      ]
    })

    render(<SocialTab />)

    // Badge should show the count
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})


