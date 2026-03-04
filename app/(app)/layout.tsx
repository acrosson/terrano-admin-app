'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { isAuthenticated, removeToken } from '@/lib/utils/auth'
import { api } from '@/lib/api/client'

const ALLOWED_ROLES = ['ADMIN', 'STAFF'] as const

type AuthStatus = 'pending' | 'verified' | 'redirecting'

export default function AuthenticatedLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const hasCheckedAuth = useRef(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('pending')

  useEffect(() => {
    // Check authentication after mount to avoid hydration mismatch
    // isAuthenticated() uses localStorage which is only available on client
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true
      if (!isAuthenticated()) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      async function verifyUser () {
        try {
          const response = await api.getMe()
          const role = response.data?.role
          if (!role || !ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
            removeToken()
            setAuthStatus('redirecting')
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
            return
          }
          setAuthStatus('verified')
        } catch {
          removeToken()
          setAuthStatus('redirecting')
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
        }
      }

      verifyUser()
    }
  }, [router, pathname])

  // Don't render protected content until /v1/users/me returns 200 and role is ADMIN or STAFF
  if (authStatus !== 'verified') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
      </div>
    )
  }

  return <AppLayout>{children}</AppLayout>
}
