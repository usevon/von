import { createFileRoute } from '@tanstack/react-router'
import { useSession, signUp, signIn, signOut, organization, apiKey, deleteUser } from '@/lib/auth/client'
import { useState, useEffect, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardPanel,
} from '@von/ui'

export const Route = createFileRoute('/test-auth')({
  component: TestAuthPage,
})

function TestAuthPage() {
  const { data, isPending } = useSession()
  const { session, user } = data ?? {}
  const [log, setLog] = useState<string[]>([])
  const prevSessionRef = useRef(data)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (prevSessionRef.current && !data && !isPending) {
      setLog([])
    }
    prevSessionRef.current = data
  }, [data, isPending])

  const addLog = (message: string, data?: unknown) => {
    const entry = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`])
    console.log(message, data)
  }

  const handleSignUp = async () => {
    addLog('Signing up...')
    const { data, error } = await signUp.email({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    })
    if (error) {
      addLog('Sign up error', error)
    } else {
      addLog('Sign up success', data)
    }
  }

  const handleSignIn = async () => {
    addLog('Signing in...')
    const { data, error } = await signIn.email({
      email: 'test@example.com',
      password: 'password123',
    })
    if (error) {
      addLog('Sign in error', error)
    } else {
      addLog('Sign in success', data)
    }
  }

  const handleSignOut = async () => {
    addLog('Signing out...')
    await signOut()
    addLog('Signed out')
    setTimeout(() => setLog([]), 500)
  }

  const handleCreateOrg = async () => {
    addLog('Creating organization...')
    const { data, error } = await organization.create({
      name: 'Test Organization',
      slug: 'test-org',
    })
    if (error) {
      addLog('Create org error', error)
    } else {
      addLog('Create org success (active org auto-set by server)', data)
    }
  }

  const handleSetActiveOrg = async () => {
    addLog('Listing organizations to find one to set active...')
    const { data: orgs, error: listError } = await organization.list()
    if (listError) {
      addLog('List orgs error', listError)
      return
    }
    if (!orgs || orgs.length === 0) {
      addLog('No organizations found')
      return
    }
    addLog('Found organizations', orgs)
    const { data, error } = await organization.setActive({
      organizationId: orgs[0].id,
    })
    if (error) {
      addLog('Set active org error', error)
    } else {
      addLog('Set active org success', data)
    }
  }

  const handleCreateApiKey = async () => {
    const orgId = session?.activeOrganizationId
    if (!orgId) {
      addLog('No active organization - set one first')
      return
    }
    addLog('Creating API key...')
    const { data, error } = await apiKey.create({
      name: 'test-api-key',
      organizationId: orgId,
    })
    if (error) {
      addLog('Create API key error', error)
    } else {
      addLog('Create API key success (save this key!)', data)
    }
  }

  const handleListApiKeys = async () => {
    addLog('Listing API keys...')
    const { data, error } = await apiKey.list()
    if (error) {
      addLog('List API keys error', error)
    } else {
      addLog('API keys', data)
    }
  }

  const handleDeleteApiKey = async () => {
    addLog('Fetching API keys to delete the first one...')
    const { data: keys, error: listError } = await apiKey.list()
    if (listError) {
      addLog('List API keys error', listError)
      return
    }
    if (!keys || keys.length === 0) {
      addLog('No API keys found to delete')
      return
    }
    const keyToDelete = keys[0]
    addLog(`Deleting API key: ${keyToDelete.start}...`)
    const { data, error } = await apiKey.delete({
      keyId: keyToDelete.id,
    })
    if (error) {
      addLog('Delete API key error', error)
    } else {
      addLog('Delete API key success', data)
    }
  }

  const handleDeleteAccount = async () => {
    addLog('Deleting account...')
    const { error } = await deleteUser()
    if (error) {
      addLog('Delete account error', error)
    } else {
      addLog('Account deleted successfully')
      setTimeout(() => setLog([]), 500)
    }
    setDeleteDialogOpen(false)
  }

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      <div className="mb-5 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          Session Status: {isPending ? 'Loading...' : data ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {!data && (
          <>
            <Button onClick={handleSignUp}>
              Sign Up
            </Button>
            <Button onClick={handleSignIn} variant="outline">
              Sign In
            </Button>
          </>
        )}
        {data && (
          <>
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
            <Button onClick={handleCreateOrg} disabled={!!session?.activeOrganizationId} variant="secondary">
              Create Org
            </Button>
            <Button onClick={handleSetActiveOrg} disabled={!!session?.activeOrganizationId} variant="secondary">
              Set Active Org
            </Button>
            {session?.activeOrganizationId && (
              <>
                <Button onClick={handleCreateApiKey} variant="outline">
                  Create API Key
                </Button>
                <Button onClick={handleListApiKeys} variant="outline">
                  List API Keys
                </Button>
                <Button onClick={handleDeleteApiKey} variant="destructive-outline">
                  Delete API Key
                </Button>
              </>
            )}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Delete Account
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="outline" />}>
                    Cancel
                  </AlertDialogClose>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </AlertDialogFooter>
              </AlertDialogPopup>
            </AlertDialog>
          </>
        )}
        <Button onClick={() => setLog([])} variant="outline">
          Clear Log
        </Button>
      </div>

      <Card className="min-h-[18.75rem] overflow-auto">
        <CardHeader>
          <CardTitle>Log Output</CardTitle>
        </CardHeader>
        <CardPanel>
          {log.map((entry, i) => (
            <pre key={i} className="whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-400">
              {entry}
            </pre>
          ))}
        </CardPanel>
      </Card>
    </div>
  )
}
