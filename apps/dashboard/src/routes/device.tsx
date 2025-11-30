import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession, device } from '@/lib/auth/client'
import { Button, Card, CardHeader, CardTitle, CardPanel } from '@usevon/ui'

export const Route = createFileRoute('/device')({
  component: DevicePage,
})

export default function DevicePage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [userCode, setUserCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{ userCode: string; clientId?: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const formattedCode = userCode.trim().replace(/-/g, '').toUpperCase()

      const { data, error: fetchError } = await device({
        query: { user_code: formattedCode },
      })

      if (fetchError || !data) {
        setError('Invalid or expired code')
        return
      }

      setDeviceInfo({ userCode: formattedCode, clientId: data.clientId })
    } catch {
      setError('Invalid or expired code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!deviceInfo) return
    setIsProcessing(true)

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
      setIsProcessing(false)
    }
  }

  const handleDeny = async () => {
    if (!deviceInfo) return
    setIsProcessing(true)

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
      setIsProcessing(false)
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
            <p className="text-gray-600 mb-4">
              You need to sign in to authorize a device.
            </p>
            <Button
              onClick={() => navigate({ to: '/test-auth', search: { redirect: currentUrl } })}
              className="w-full"
            >
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
            <p className="text-gray-600 mb-4">
              A device is requesting access to your account.
            </p>
            <div className="bg-muted rounded-lg p-4 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Device Code</p>
              <p className="text-2xl font-mono font-bold">{deviceInfo.userCode}</p>
              {deviceInfo.clientId && (
                <p className="text-sm text-gray-500 mt-2">Client: {deviceInfo.clientId}</p>
              )}
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleDeny}
                variant="outline"
                disabled={isProcessing}
                className="flex-1"
              >
                Deny
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Approve'}
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
          <p className="text-gray-600 mb-4">
            Enter the code displayed on your device.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-wider mb-4"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}
            <Button type="submit" disabled={isLoading || !userCode.trim()} className="w-full">
              {isLoading ? 'Verifying...' : 'Continue'}
            </Button>
          </form>
        </CardPanel>
      </Card>
    </div>
  )
}
