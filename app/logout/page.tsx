'use client'

import { useEffect } from 'react'
import { removeToken } from '@/lib/utils/auth'

export default function LogoutPage () {
  useEffect(() => {
    removeToken()
    window.location.href = '/login'
  }, [])

  return null
}
