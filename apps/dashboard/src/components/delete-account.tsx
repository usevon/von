"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  Spinner,
  toastManager,
} from "@usevon/ui";

import { deleteUser } from "@/lib/auth/client";

export const DeleteAccount = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    const { error } = await deleteUser();

    if (error) {
      toastManager.add({ title: "Failed to delete account", type: "error" });
      setIsLoading(false);
      return;
    }

    toastManager.add({ title: "Account deleted", type: "success" });
    router.push("/auth/login");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Your account and all associated data will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <AlertDialogClose
            disabled={isLoading}
            onClick={handleDelete}
            render={<Button variant="destructive" />}
          >
            {isLoading ? (
              <>
                <Spinner />
                Deleting...
              </>
            ) : (
              "Delete account"
            )}
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};
