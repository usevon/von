import { useState } from 'react'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogPanel,
  Button,
  Form,
  Field,
  FieldLabel,
  FieldDescription,
  Input,
} from '@von/ui'

type CreateInboundDialogProps = {
  onCreated: () => void
  disabled?: boolean
}

export const CreateInboundDialog = (props: CreateInboundDialogProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const forwardUrl = formData.get('forwardUrl') as string

    setLoading(true)

    const { error } = await api.inbound.post(
      { name: name || undefined, forwardUrl },
      { fetch: { credentials: 'include' } }
    )

    setLoading(false)

    if (error) {
      console.error('Error creating inbound endpoint:', error)
      return
    }

    setOpen(false)
    props.onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>Create Inbound Endpoint</DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Inbound Endpoint</DialogTitle>
            <DialogDescription>Create a public URL to receive webhooks from external services.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input name="name" placeholder="Stripe webhooks" />
              <FieldDescription>Optional name to identify this endpoint</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Forward URL</FieldLabel>
              <Input name="forwardUrl" type="url" placeholder="https://example.com/inbound-webhook" required />
              <FieldDescription>Where incoming webhooks will be forwarded to</FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter variant="bare">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  )
}
