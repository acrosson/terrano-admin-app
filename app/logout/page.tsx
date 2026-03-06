'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { removeToken } from '@/lib/utils/auth'
import Link from 'next/link'

export default function LogoutPage () {
  const router = useRouter()

  useEffect(() => {
    removeToken()
    router.replace('/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        If you&apos;re not automatically redirected in 10 seconds,{' '}
        <Link href="/login" className="text-primary underline">
          click here to login again
        </Link>
        .
      </p>
    </div>
  )
}
