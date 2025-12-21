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
import { organization } from "@/lib/auth/client";

type CreateOrganizationDialogProps = {
  onCreated?: () => void;
};

export const CreateOrganizationDialog = (
  props: CreateOrganizationDialogProps
) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    setLoading(true);
    setError(null);

    const { data: newOrg, error: createError } = await organization.create({
      name,
      slug,
    });

    if (createError) {
      setLoading(false);
      setError(createError.message || "Failed to create organization");
      return;
    }

    await organization.setActive({ organizationId: newOrg.id });

    setLoading(false);
    setOpen(false);
    props.onCreated?.();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.currentTarget.form;
    if (!form) return;
    const slugInput = form.elements.namedItem("slug") as HTMLInputElement;
    if (slugInput && !slugInput.dataset.modified) {
      slugInput.value = generateSlug(e.currentTarget.value);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.currentTarget.dataset.modified = "true";
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button />}>Create Organization</DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage webhooks and API keys.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            {error ? (
              <div className="rounded bg-red-100 p-3 text-red-700 text-sm">
                {error}
              </div>
            ) : null}
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                name="name"
                onChange={handleNameChange}
                placeholder="My Company"
                required
              />
              <FieldDescription>
                The display name for your organization
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Slug</FieldLabel>
              <Input
                name="slug"
                onChange={handleSlugChange}
                pattern="[a-z0-9-]+"
                placeholder="my-company"
                required
              />
              <FieldDescription>
                URL-friendly identifier (lowercase, numbers, hyphens only)
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
