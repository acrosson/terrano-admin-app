'use client'

import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useRouter } from 'next/navigation'

export function Providers ({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <HeroUIProvider navigate={router.push}>
        <ToastProvider placement="bottom-right" />
        {children}
      </HeroUIProvider>
    </NextThemesProvider>
  )
}
