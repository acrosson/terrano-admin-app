import { isAuthenticated } from './auth'

export function requireAuth (): { redirect: { destination: string; permanent: boolean } } | null {
  if (!isAuthenticated()) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    }
  }
  return null
}
