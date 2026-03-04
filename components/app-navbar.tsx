'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { api, type User } from '@/lib/api/client'
import { isAuthenticated } from '@/lib/utils/auth'

interface AppNavbarProps {
  onNavigate?: () => void
}

export function AppNavbar ({ onNavigate }: AppNavbarProps = {}) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchUser () {
      if (!isAuthenticated()) return

      try {
        const response = await api.getMe()
        if (response.data) {
          setUser(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/users', label: 'Users' }
  ]

  return (
    <nav className="flex h-full w-full flex-col border-r-0 bg-transparent p-6 dark:border-zinc-700 md:w-64 md:border-r md:border-zinc-200 md:bg-white md:dark:bg-zinc-800 md:h-screen">
      <Link href="/" className="mb-8 hidden md:flex md:items-center md:gap-3" onClick={onNavigate}>
        {mounted && theme === 'dark' ? (
          <Image
            src="/images/Terrano_logo_white.png"
            alt="Terrano Logo"
            width={79}
            height={20}
            className="h-auto"
            priority
          />
        ) : (
          <Image
            src="/images/Terrano_logo_black.png"
            alt="Terrano Logo"
            width={79}
            height={20}
            className="h-auto"
            priority
          />
        )}
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Admin</span>
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              variant={isActive ? 'solid' : 'light'}
              color={isActive ? 'primary' : 'default'}
              className="justify-start"
              fullWidth
              onPress={onNavigate}
            >
              {item.label}
            </Button>
          )
        })}
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="mb-4">
          {mounted && (
            <Button
              variant="light"
              className="w-full justify-start"
              onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <span className="mr-2">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="text-sm">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </Button>
          )}
        </div>
        {loading ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : user ? (
          <Dropdown placement="top-start">
            <DropdownTrigger>
              <button className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700">
                <div className="text-sm">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{user.primary_email}</div>
                </div>
              </button>
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
              <DropdownItem
                key="logout"
                as={Link}
                href="/logout"
              >
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">User Profile</div>
        )}
      </div>
    </nav>
  )
}
