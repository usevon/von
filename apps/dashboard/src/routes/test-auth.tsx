import { createFileRoute } from '@tanstack/react-router'
import { useSession, signUp, signIn, signOut, organization, apiKey } from '@/lib/auth/client'
import { useState, useEffect, useRef } from 'react'

export const Route = createFileRoute('/test-auth')({
  component: TestAuthPage,
})

function TestAuthPage() {
  const { data: session, isPending } = useSession()
  const [log, setLog] = useState<string[]>([])
  const prevSessionRef = useRef(session)

  useEffect(() => {
    // Clear log when user signs out (session changes from truthy to null)
    if (prevSessionRef.current && !session && !isPending) {
      setLog([])
    }
    prevSessionRef.current = session
  }, [session, isPending])

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
    const orgId = session?.session?.activeOrganizationId
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

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      <div className="mb-5 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">
          Session Status: {isPending ? 'Loading...' : session ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={handleSignUp}
          disabled={!!session}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Sign Up
        </button>
        <button
          onClick={handleSignIn}
          disabled={!!session}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Sign In
        </button>
        <button
          onClick={handleSignOut}
          disabled={!session}
          className="p-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Sign Out
        </button>
        <button
          onClick={handleCreateOrg}
          disabled={!session || !!session?.session?.activeOrganizationId}
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create Org
        </button>
        <button
          onClick={handleSetActiveOrg}
          disabled={!session || !!session?.session?.activeOrganizationId}
          className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Set Active Org
        </button>
        <button
          onClick={handleCreateApiKey}
          disabled={!session?.session?.activeOrganizationId}
          className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create API Key
        </button>
        <button
          onClick={handleListApiKeys}
          disabled={!session?.session?.activeOrganizationId}
          className="p-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          List API Keys
        </button>
        <button
          onClick={handleDeleteApiKey}
          disabled={!session?.session?.activeOrganizationId}
          className="p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Delete API Key
        </button>
        <button onClick={() => setLog([])} className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Clear Log
        </button>
      </div>

      <div className="bg-black text-green-400 p-4 min-h-[18.75rem] overflow-auto rounded border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-3">Log Output</h3>
        {log.map((entry, i) => (
          <pre key={i} className="my-1 whitespace-pre-wrap text-xs">
            {entry}
          </pre>
        ))}
      </div>
    </div>
  )
}
