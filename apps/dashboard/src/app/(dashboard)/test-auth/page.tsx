"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@usevon/ui";
import { useEffect, useRef, useState } from "react";
import {
  apiKey,
  deleteUser,
  organization,
  signIn,
  signOut,
  signUp,
  useSession,
} from "@/lib/auth/client";

export default function TestAuthPage() {
  const { data, isPending } = useSession();
  const { session } = data ?? {};
  const [log, setLog] = useState<string[]>([]);
  const prevSessionRef = useRef(data);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getSessionStatus = () => {
    if (!mounted || isPending) {
      return "Loading...";
    }
    if (data) {
      return "Authenticated";
    }
    return "Not authenticated";
  };
  const sessionStatus = getSessionStatus();

  useEffect(() => {
    if (prevSessionRef.current && !data && !isPending) {
      setLog([]);
    }
    prevSessionRef.current = data;
  }, [data, isPending]);

  const addLog = (message: string, logData?: unknown) => {
    const entry = logData
      ? `${message}: ${JSON.stringify(logData, null, 2)}`
      : message;
    setLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${entry}`,
    ]);
    console.log(message, logData);
  };

  const handleSignUp = async () => {
    addLog("Signing up...");
    const { data: result, error: signUpError } = await signUp.email({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    if (signUpError) {
      addLog("Sign up error", signUpError);
    } else {
      addLog("Sign up success", result);
    }
  };

  const handleSignIn = async () => {
    addLog("Signing in...");
    const { data: result, error: signInError } = await signIn.email({
      email: "test@example.com",
      password: "password123",
    });
    if (signInError) {
      addLog("Sign in error", signInError);
    } else {
      addLog("Sign in success", result);
    }
  };

  const handleSignOut = async () => {
    addLog("Signing out...");
    await signOut();
    addLog("Signed out");
    setTimeout(() => setLog([]), 500);
  };

  const handleCreateOrg = async () => {
    addLog("Creating organization...");
    const { data: result, error: createError } = await organization.create({
      name: "Test Organization",
      slug: "test-org",
    });
    if (createError) {
      addLog("Create org error", createError);
    } else {
      addLog("Create org success (active org auto-set by server)", result);
    }
  };

  const handleSetActiveOrg = async () => {
    addLog("Listing organizations to find one to set active...");
    const { data: orgs, error: listError } = await organization.list();
    if (listError) {
      addLog("List orgs error", listError);
      return;
    }
    if (!orgs || orgs.length === 0) {
      addLog("No organizations found");
      return;
    }
    addLog("Found organizations", orgs);
    const { data: result, error: setActiveError } =
      await organization.setActive({
        organizationId: orgs[0].id,
      });
    if (setActiveError) {
      addLog("Set active org error", setActiveError);
    } else {
      addLog("Set active org success", result);
    }
  };

  const handleCreateApiKey = async () => {
    const orgId = session?.activeOrganizationId;
    if (!orgId) {
      addLog("No active organization - set one first");
      return;
    }
    addLog("Creating API key...");
    const { data: result, error: createKeyError } = await apiKey.create({
      name: "test-api-key",
      environment: "dev",
      organizationId: orgId,
    });
    if (createKeyError) {
      addLog("Create API key error", createKeyError);
    } else {
      addLog("Create API key success (save this key!)", result);
    }
  };

  const handleListApiKeys = async () => {
    addLog("Listing API keys...");
    const { data: keys, error: listKeysError } = await apiKey.list();
    if (listKeysError) {
      addLog("List API keys error", listKeysError);
    } else {
      addLog("API keys", keys);
    }
  };

  const handleDeleteApiKey = async () => {
    addLog("Fetching API keys to delete the first one...");
    const { data: keys, error: listError } = await apiKey.list();
    if (listError) {
      addLog("List API keys error", listError);
      return;
    }
    if (!keys || keys.length === 0) {
      addLog("No API keys found to delete");
      return;
    }
    const keyToDelete = keys[0];
    addLog(`Deleting API key: ${keyToDelete.start}...`);
    const { data: result, error: deleteKeyError } = await apiKey.delete({
      keyId: keyToDelete.id,
    });
    if (deleteKeyError) {
      addLog("Delete API key error", deleteKeyError);
    } else {
      addLog("Delete API key success", result);
    }
  };

  const handleDeleteAccount = async () => {
    addLog("Deleting account...");
    const { error: deleteError } = await deleteUser();
    if (deleteError) {
      addLog("Delete account error", deleteError);
    } else {
      addLog("Account deleted successfully");
      setTimeout(() => setLog([]), 500);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="font-mono">
      <h1 className="mb-4 font-bold text-2xl">Auth Test Page</h1>

      <div className="mb-5 rounded-lg bg-muted p-4">
        <h3 className="mb-2 font-semibold text-lg">
          Session Status: {sessionStatus}
        </h3>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {data === null && (
          <>
            <Button onClick={handleSignUp}>Sign Up</Button>
            <Button onClick={handleSignIn} variant="outline">
              Sign In
            </Button>
          </>
        )}
        {data !== null && (
          <>
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
            {!session?.activeOrganizationId && (
              <>
                <Button onClick={handleCreateOrg} variant="secondary">
                  Create Org
                </Button>
                <Button onClick={handleSetActiveOrg} variant="secondary">
                  Set Active Org
                </Button>
              </>
            )}
            {session?.activeOrganizationId && (
              <>
                <Button onClick={handleCreateApiKey} variant="secondary">
                  Create API Key
                </Button>
                <Button onClick={handleListApiKeys} variant="secondary">
                  List API Keys
                </Button>
                <Button onClick={handleDeleteApiKey} variant="secondary">
                  Delete API Key
                </Button>
              </>
            )}
            <AlertDialog
              onOpenChange={setDeleteDialogOpen}
              open={deleteDialogOpen}
            >
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Delete Account
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your account? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="outline" />}>
                    Cancel
                  </AlertDialogClose>
                  <Button onClick={handleDeleteAccount} variant="destructive">
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
          {log.map((entry) => (
            <pre
              className="whitespace-pre-wrap text-neutral-600 text-xs dark:text-neutral-400"
              key={entry}
            >
              {entry}
            </pre>
          ))}
        </CardPanel>
      </Card>
    </div>
  );
}
