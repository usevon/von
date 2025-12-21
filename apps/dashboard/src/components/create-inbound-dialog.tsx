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
import { useState } from "react";
import { api } from "@/lib/api";

type CreateInboundDialogProps = {
  onCreated: () => void;
  disabled?: boolean;
};

export const CreateInboundDialog = (props: CreateInboundDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const forwardUrl = formData.get("forwardUrl") as string;

    setLoading(true);

    const { error } = await api.inbound.post(
      { name: name || undefined, forwardUrl },
      { fetch: { credentials: "include" } }
    );

    setLoading(false);

    if (error) {
      console.error("Error creating inbound endpoint:", error);
      return;
    }

    setOpen(false);
    props.onCreated();
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>
        Create Inbound Endpoint
      </DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Inbound Endpoint</DialogTitle>
            <DialogDescription>
              Create a public URL to receive webhooks from external services.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Stripe webhooks" />
              <FieldDescription>
                Optional name to identify this endpoint
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Forward URL</FieldLabel>
              <Input
                name="forwardUrl"
                placeholder="https://example.com/inbound-webhook"
                required
                type="url"
              />
              <FieldDescription>
                Where incoming webhooks will be forwarded to
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
