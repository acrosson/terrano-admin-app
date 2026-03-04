'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, InputOtp } from '@heroui/react'
import { api } from '@/lib/api/client'
import { setToken, isAuthenticated } from '@/lib/utils/auth'
import { ThemeSwitcher } from '@/components/theme-switcher'

export default function LoginPage () {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getRedirectPath (redirect: string | null): string {
    if (!redirect) return '/'
    // Only allow relative paths (starting with /) to prevent open redirects
    if (redirect.startsWith('/')) {
      return redirect
    }
    return '/'
  }

  useEffect(() => {
    if (isAuthenticated()) {
      const redirect = searchParams.get('redirect')
      router.push(getRedirectPath(redirect))
    }
  }, [router, searchParams])

  async function handleRequestCode (e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await api.requestCode(email)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request code')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyCode (e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await api.verifyCode(email, code)
      if (response.data?.access_token) {
        setToken(response.data.access_token)
        const redirect = searchParams.get('redirect')
        router.push(getRedirectPath(redirect))
        router.refresh()
      } else {
        setError('Invalid response from server')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="relative w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-800">
        <div className="absolute right-4 top-4">
          <ThemeSwitcher />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-zinc-100">Admin Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {step === 'email'
              ? 'Enter your email to receive a login code'
              : 'Enter the code sent to your email'}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              isDisabled={isLoading}
            />
            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Send Code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Verification Code</label>
              <InputOtp
                value={code}
                onValueChange={setCode}
                length={6}
                isDisabled={isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="light"
                className="flex-1"
                onPress={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                isDisabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                color="primary"
                className="flex-1"
                isLoading={isLoading}
              >
                Verify
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
