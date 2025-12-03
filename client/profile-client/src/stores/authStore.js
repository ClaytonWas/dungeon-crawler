import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: (userData) => set({ user: userData, isAuthenticated: true }),
  
  logout: async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        set({ user: userData, isAuthenticated: true })
        return true
      }
    } catch (error) {
      console.error('Auth check error:', error)
    }
    set({ user: null, isAuthenticated: false })
    return false
  }
}))

