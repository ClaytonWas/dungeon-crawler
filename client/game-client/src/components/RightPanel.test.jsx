import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RightPanel from './RightPanel'

// Basic smoke tests for the main side panel UI
describe('RightPanel', () => {
  it('renders all tab buttons', () => {
    render(<RightPanel />)

    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Social')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('shows Stats tab content by default', () => {
    render(<RightPanel />)

    // Heading from StatsTab
    expect(screen.getByText(/Character Stats/i)).toBeInTheDocument()
  })

  it('switches to Social tab when clicked', () => {
    render(<RightPanel />)

    const socialTab = screen.getByText('Social')
    fireEvent.click(socialTab)

    // Heading from SocialTab - at least one "Party" label is visible
    const partyTexts = screen.getAllByText(/Party/i)
    expect(partyTexts.length).toBeGreaterThan(0)
  })
})


