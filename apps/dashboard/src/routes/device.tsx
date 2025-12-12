import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession, device } from '@/lib/auth/client'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardPanel,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from '@usevon/ui'

export const Route = createFileRoute('/device')({
  component: DevicePage,
  validateSearch: (search: Record<string, unknown>) => ({
    user_code: typeof search.user_code === 'string' ? search.user_code : undefined,
  }),
  loaderDeps: ({ search }) => ({ user_code: search.user_code }),
  loader: async ({ deps }) => {
    if (!deps.user_code) return { prevalidated: null, error: null }

    const formattedCode = deps.user_code.trim().replace(/-/g, '').toUpperCase()
    const { data, error } = await device({
      query: { user_code: formattedCode },
    })

    if (error || !data) return { prevalidated: null, error: 'Invalid or expired code' }
    return { prevalidated: { userCode: formattedCode }, error: null }
  },
})

type Status = 'idle' | 'verifying' | 'processing'

export default function DevicePage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const loaderData = Route.useLoaderData()

  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState<string | null>(loaderData.error)
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string } | null>(loaderData.prevalidated)
  const [status, setStatus] = useState<Status>('idle')

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? userCode
    if (!codeToVerify.trim()) return

    setError(null)
    setStatus('verifying')

    try {
      const formattedCode = codeToVerify.trim().replace(/-/g, '').toUpperCase()
      const { data, error: fetchError } = await device({
        query: { user_code: formattedCode },
      })

      if (fetchError || !data) {
        setError('Invalid or expired code')
        return
      }

      setDeviceInfo({ userCode: formattedCode })
    } catch {
      setError('Invalid or expired code')
    } finally {
      setStatus('idle')
    }
  }

  const handleApprove = async () => {
    if (!deviceInfo) return
    setStatus('processing')

    try {
      const { error: approveError } = await device.approve({
        userCode: deviceInfo.userCode,
      })

      if (approveError) {
        setError('Failed to approve device')
        return
      }

      setDeviceInfo(null)
      setUserCode('')
      navigate({ to: '/' })
    } catch {
      setError('Failed to approve device')
    } finally {
      setStatus('idle')
    }
  }

  const handleDeny = async () => {
    if (!deviceInfo) return
    setStatus('processing')

    try {
      const { error: denyError } = await device.deny({
        userCode: deviceInfo.userCode,
      })

      if (denyError) {
        setError('Failed to deny device')
        return
      }

      setDeviceInfo(null)
      setUserCode('')
      setError('Device authorization denied')
    } catch {
      setError('Failed to deny device')
    } finally {
      setStatus('idle')
    }
  }

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="text-gray-600 mb-4">You need to sign in to authorize a device.</p>
            <Button onClick={() => navigate({ to: '/test-auth', search: { redirect: currentUrl } })} className="w-full">
              Sign In
            </Button>
          </CardPanel>
        </Card>
      </div>
    )
  }

  if (deviceInfo) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-5">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authorize Device</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="text-gray-600 mb-4">A device is requesting access to your account.</p>
            <div className="bg-muted rounded-lg p-4 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Device Code</p>
              <p className="text-2xl font-mono font-bold">{deviceInfo.userCode}</p>
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={handleDeny} variant="outline" disabled={status === 'processing'} className="flex-1">
                Deny
              </Button>
              <Button onClick={handleApprove} disabled={status === 'processing'} className="flex-1">
                {status === 'processing' ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          </CardPanel>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-5">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Device Authorization</CardTitle>
        </CardHeader>
        <CardPanel>
          <p className="text-gray-600 mb-4">Enter the code displayed on your device.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerify()
            }}
          >
            <div className="flex justify-center mb-4">
              <InputOTP
                maxLength={8}
                value={userCode}
                onChange={setUserCode}
                pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                onComplete={handleVerify}
                containerClassName="gap-2"
                render={({ slots }) => (
                  <>
                    <InputOTPGroup>
                      {slots.slice(0, 4).map((slot, i) => (
                        <InputOTPSlot key={i} {...slot} />
                      ))}
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      {slots.slice(4).map((slot, i) => (
                        <InputOTPSlot key={i} {...slot} />
                      ))}
                    </InputOTPGroup>
                  </>
                )}
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <Button type="submit" disabled={status === 'verifying' || userCode.length < 8} className="w-full">
              {status === 'verifying' ? 'Verifying...' : 'Continue'}
            </Button>
          </form>
        </CardPanel>
      </Card>
    </div>
  )
}
