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
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from '@usevon/ui'

export const Route = createFileRoute('/device')({
  component: DevicePage,
  validateSearch: (search: Record<string, unknown>) => ({
    user_code: typeof search.user_code === 'string' ? search.user_code : undefined,
  }),
  loaderDeps: ({ search }) => ({ user_code: search.user_code }),
  loader: async ({ deps }) => {
    if (!deps.user_code) return { prevalidated: null }

    const formattedCode = deps.user_code.trim().replace(/-/g, '').toUpperCase()
    const { data, error } = await device({
      query: { user_code: formattedCode },
    })

    if (error || !data) return { prevalidated: null }
    return { prevalidated: { userCode: formattedCode } }
  },
})

type Status = 'idle' | 'verifying' | 'processing'

export default function DevicePage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const loaderData = Route.useLoaderData()
  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string } | null>(loaderData.prevalidated)
  const [status, setStatus] = useState<Status>('idle')

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
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
            <p className="text-muted-foreground mb-4">You need to sign in to authorize a device.</p>
            <Button onClick={() => navigate({ to: '/test-auth', search: { redirect: currentUrl } })} className="w-full">
              Sign In
            </Button>
          </CardPanel>
        </Card>
      </div>
    )
  }

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? userCode
    if (!codeToVerify.trim()) return
    setError(false)
    setStatus('verifying')
    try {
      const formattedCode = codeToVerify.trim().replace(/-/g, '').toUpperCase()
      const { data, error: fetchError } = await device({ query: { user_code: formattedCode } })
      if (fetchError || !data) {
        setError(true)
        return
      }
      setDeviceInfo({ userCode: formattedCode })
    } catch {
      setError(true)
    } finally {
      setStatus('idle')
    }
  }

  const handleApprove = async () => {
    if (!deviceInfo) return
    setStatus('processing')
    try {
      const { error: approveError } = await device.approve({ userCode: deviceInfo.userCode })
      if (approveError) return
      navigate({ to: '/' })
    } catch {
      // silently fail
    } finally {
      setStatus('idle')
    }
  }

  const handleDeny = async () => {
    if (!deviceInfo) return
    setStatus('processing')
    try {
      await device.deny({ userCode: deviceInfo.userCode })
    } catch {
      // silently fail
    } finally {
      navigate({ to: '/' })
    }
  }

  const title = deviceInfo ? 'Authorize Device' : 'Device Authorization'
  const description = deviceInfo
    ? 'A device is requesting access to your account.'
    : 'Enter the code displayed on your device.'

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-5">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardPanel>
          <p className="text-muted-foreground mb-4">{description}</p>
          <div className="flex justify-center mb-4">
            <InputOTP
              maxLength={8}
              groupSize={4}
              value={deviceInfo?.userCode ?? userCode}
              onChange={deviceInfo ? undefined : (v) => { setUserCode(v); setError(false) }}
              pattern={deviceInfo ? undefined : REGEXP_ONLY_DIGITS_AND_CHARS}
              onComplete={deviceInfo ? undefined : handleVerify}
              error={error}
              disabled={!!deviceInfo}
            />
          </div>
          <div className="flex gap-3 justify-center">
            {deviceInfo ? (
              <>
                <Button onClick={handleDeny} variant="outline" disabled={status === 'processing'}>
                  Deny
                </Button>
                <Button onClick={handleApprove} disabled={status === 'processing'}>
                  {status === 'processing' ? 'Processing...' : 'Approve'}
                </Button>
              </>
            ) : (
              <Button onClick={() => handleVerify()} disabled={status === 'verifying' || userCode.length < 8}>
                {status === 'verifying' ? 'Verifying...' : 'Continue'}
              </Button>
            )}
          </div>
        </CardPanel>
      </Card>
    </div>
  )
}
