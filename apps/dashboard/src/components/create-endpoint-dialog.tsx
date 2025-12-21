"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  Input,
} from "@usevon/ui";
import { toastManager } from "@usevon/ui";
import { useState } from "react";
import { createEndpoint } from "@/actions/endpoints";

type CreateEndpointDialogProps = {
  onCreated: () => void;
  disabled?: boolean;
};

export const CreateEndpointDialog = (props: CreateEndpointDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;
    const description = formData.get("description") as string;

    setLoading(true);

    try {
      await createEndpoint({ url, description: description || undefined });
      setOpen(false);
      props.onCreated();
    } catch {
      toastManager.add({
        title: "Failed to create endpoint",
        description: "Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>
        Create Endpoint
      </DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Endpoint</DialogTitle>
            <DialogDescription>
              Add a new webhook endpoint to receive events.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>URL</FieldLabel>
              <Input
                name="url"
                placeholder="https://example.com/webhook"
                required
                type="url"
              />
              <FieldDescription>
                The URL where webhooks will be delivered
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input name="description" placeholder="Production webhook" />
              <FieldDescription>
                Optional description to identify this endpoint
              </FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter variant="bare">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={loading} type="submit">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
};
