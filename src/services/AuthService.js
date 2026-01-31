/**
 * Authentication Service
 * Handles user authentication with up to 4 users from environment variables.
 * For Netlify: set VITE_LOGIN_USER_1, VITE_LOGIN_PASS_1, ... VITE_LOGIN_USER_4, VITE_LOGIN_PASS_4 in Site settings > Environment variables.
 */

const USER_KEYS = ['VITE_LOGIN_USER_1', 'VITE_LOGIN_PASS_1', 'VITE_LOGIN_USER_2', 'VITE_LOGIN_PASS_2', 'VITE_LOGIN_USER_3', 'VITE_LOGIN_PASS_3', 'VITE_LOGIN_USER_4', 'VITE_LOGIN_PASS_4']
const FALLBACK_USER = 'admin'
const FALLBACK_PASS = 'admin123'

function getValidUsers() {
  const users = []
  for (let i = 0; i < 4; i++) {
    const u = import.meta.env[`VITE_LOGIN_USER_${i + 1}`]
    const p = import.meta.env[`VITE_LOGIN_PASS_${i + 1}`]
    if (u && p) users.push({ username: u, password: p })
  }
  if (users.length === 0) {
    users.push({ username: FALLBACK_USER, password: FALLBACK_PASS })
  }
  return users
}

class AuthService {
  constructor() {
    this.authKey = 'finance_app_auth'
    this.usernameKey = 'finance_app_username'
  }

  getValidUsers() {
    return getValidUsers()
  }

  /**
   * Attempt to login with username and password (checks all 4 env users)
   */
  login(username, password) {
    const users = getValidUsers()
    const match = users.find(u => u.username === username && u.password === password)
    if (match) {
      const authToken = this.generateToken()
      localStorage.setItem(this.authKey, authToken)
      localStorage.setItem('auth_timestamp', Date.now().toString())
      localStorage.setItem(this.usernameKey, match.username)
      return true
    }
    return false
  }

  /**
   * Get current logged-in username (for Supabase user_id scoping)
   */
  getCurrentUsername() {
    return localStorage.getItem(this.usernameKey) || null
  }

  /**
   * Display name for Dashboard welcome: user 1 sees "Prime", others see their username
   * User 1 = first in env list (VITE_LOGIN_USER_1, or fallback admin)
   */
  getWelcomeDisplayName() {
    const username = this.getCurrentUsername()
    if (!username) return 'Prime'
    const users = getValidUsers()
    const firstUser = users[0]
    return firstUser && username === firstUser.username ? 'Prime' : username
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem(this.authKey)
    if (!token) return false
    
    // Optional: Check if token is expired (e.g., 30 days)
    const timestamp = localStorage.getItem('auth_timestamp')
    if (timestamp) {
      const daysSinceLogin = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24)
      if (daysSinceLogin > 30) {
        this.logout()
        return false
      }
    }
    
    return true
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem(this.authKey)
    localStorage.removeItem('auth_timestamp')
    localStorage.removeItem(this.usernameKey)
  }

  /**
   * Generate a simple auth token
   */
  generateToken() {
    const username = localStorage.getItem(this.usernameKey) || 'user'
    return btoa(`${username}:${Date.now()}`)
  }
}

// Export singleton instance
export default new AuthService()
