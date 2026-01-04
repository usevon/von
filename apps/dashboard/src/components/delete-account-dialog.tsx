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
  toastManager,
} from "@usevon/ui";
import { useState } from "react";
import { deleteUser, signOut } from "@/lib/auth/client";

type DeleteAccountDialogProps = {
  onDeleted?: () => void;
};

export const DeleteAccountDialog = (props: DeleteAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await deleteUser();
      if (error) {
        toastManager.add({
          title: "Failed to delete account",
          description: "Please try again.",
          type: "error",
        });
      } else {
        setOpen(false);
        await signOut();
        toastManager.add({
          title: "Account deleted",
          description: "Your account has been permanently removed.",
          type: "success",
        });
        props.onDeleted?.();
      }
    } catch {
      toastManager.add({
        title: "Failed to delete account",
        description: "Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete Account
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete your account? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>
            Cancel
          </AlertDialogClose>
          <Button
            disabled={loading}
            onClick={handleDelete}
            variant="destructive"
          >
            {loading ? "Deleting..." : "Delete Account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
};
