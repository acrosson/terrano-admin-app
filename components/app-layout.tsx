'use client'

import { useState } from 'react'
import { AppNavbar } from './app-navbar'
import { Button, Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/react'

export function AppLayout ({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <AppNavbar />
      </div>

      {/* Mobile Hamburger Button */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>
      </div>

      {/* Mobile Drawer Menu */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        placement="left"
        size="sm"
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Menu</span>
          </DrawerHeader>
          <DrawerBody className="p-0">
            <AppNavbar onNavigate={() => setIsMobileMenuOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <main className="flex-1 overflow-y-auto md:ml-0">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
