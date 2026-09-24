import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('user') || 'null')
  }),
  actions: {
    setUser(u) {
      this.user = u
      sessionStorage.setItem('user', JSON.stringify(u))
    },
    logout() {
      this.user = null
      sessionStorage.removeItem('user')
    }
  }
})
