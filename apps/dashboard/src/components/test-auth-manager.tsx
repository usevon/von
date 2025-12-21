"use client";

import { Button, toastManager } from "@usevon/ui";
import { useState } from "react";
import { CreateOrganizationDialog } from "@/components/create-organization-dialog";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { LogOutput } from "@/components/log-output";
import { apiKey, organization, signIn, signOut, signUp, useSession } from "@/lib/auth/client";
import type { Session, User } from "@/lib/auth";

type TestAuthManagerProps = {
  session: { session: Session["session"]; user: User } | null;
};

export const TestAuthManager = (props: TestAuthManagerProps) => {
  const { data, isPending } = useSession();
  const { session } = data ?? {};
  const [log, setLog] = useState<{ id: string; entry: string }[]>([]);

  const isAuthenticated = props.session !== null || data !== null;

  const addLog = (message: string, logData?: unknown) => {
    const text = logData
      ? `${message}: ${JSON.stringify(logData, null, 2)}`
      : message;
    setLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), entry: `[${new Date().toLocaleTimeString()}] ${text}` },
    ]);
  };

  const showError = (title: string, message?: string) => {
    toastManager.add({
      title,
      description: message ?? "Please try again.",
      type: "error",
    });
  };

  const handleSignUp = async () => {
    addLog("Signing up...");
    const { data: result, error } = await signUp.email({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    if (error) {
      showError("Sign up failed", error.message);
    } else {
      addLog("Sign up success", result);
    }
  };

  const handleSignIn = async () => {
    addLog("Signing in...");
    const { data: result, error } = await signIn.email({
      email: "test@example.com",
      password: "password123",
    });
    if (error) {
      showError("Sign in failed", error.message);
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

  const handleSetActiveOrg = async () => {
    addLog("Listing organizations...");
    const { data: orgs, error: listError } = await organization.list();
    if (listError) {
      showError("Failed to list organizations", listError.message);
      return;
    }
    if (!orgs || orgs.length === 0) {
      showError("No organizations found");
      return;
    }
    addLog("Found organizations", orgs);
    const { data: result, error } = await organization.setActive({
      organizationId: orgs[0].id,
    });
    if (error) {
      showError("Failed to set active organization", error.message);
    } else {
      addLog("Set active org success", result);
    }
  };

  const handleCreateApiKey = async () => {
    const orgId = session?.activeOrganizationId;
    if (!orgId) {
      showError("No active organization", "Set an organization first.");
      return;
    }
    addLog("Creating API key...");
    const { data: result, error } = await apiKey.create({
      name: "test-api-key",
      environment: "dev",
      organizationId: orgId,
    });
    if (error) {
      showError("Failed to create API key", error.message);
    } else {
      addLog("Create API key success (save this key!)", result);
    }
  };

  const handleListApiKeys = async () => {
    addLog("Listing API keys...");
    const { data: keys, error } = await apiKey.list();
    if (error) {
      showError("Failed to list API keys", error.message);
    } else {
      addLog("API keys", keys);
    }
  };

  const handleDeleteApiKey = async () => {
    addLog("Fetching API keys...");
    const { data: keys, error: listError } = await apiKey.list();
    if (listError) {
      showError("Failed to list API keys", listError.message);
      return;
    }
    if (!keys || keys.length === 0) {
      showError("No API keys found to delete");
      return;
    }
    const keyToDelete = keys[0];
    addLog(`Deleting API key: ${keyToDelete.start}...`);
    const { data: result, error } = await apiKey.delete({
      keyId: keyToDelete.id,
    });
    if (error) {
      showError("Failed to delete API key", error.message);
    } else {
      addLog("Delete API key success", result);
    }
  };

  const getSessionStatus = () => {
    if (isPending) return "Loading...";
    if (isAuthenticated) return "Authenticated";
    return "Not authenticated";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Auth Test Page</h1>
      </div>

      <div className="mb-5 shrink-0 rounded-lg bg-muted p-4 font-mono">
        <h3 className="mb-2 font-semibold text-lg">
          Session Status: {getSessionStatus()}
        </h3>
        <pre className="overflow-auto text-xs">
          {JSON.stringify(data ?? props.session, null, 2)}
        </pre>
      </div>

      <div className="mb-5 flex shrink-0 flex-wrap gap-2">
        {!isAuthenticated && (
          <>
            <Button onClick={handleSignUp}>Sign Up</Button>
            <Button onClick={handleSignIn} variant="outline">
              Sign In
            </Button>
          </>
        )}
        {isAuthenticated && (
          <>
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
            {!session?.activeOrganizationId && (
              <>
                <CreateOrganizationDialog onCreated={() => addLog("Organization created")} />
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
            <DeleteAccountDialog onDeleted={() => setLog([])} />
          </>
        )}
        <Button onClick={() => setLog([])} variant="outline">
          Clear Log
        </Button>
      </div>

      <LogOutput entries={log} />
    </div>
  );
};
