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
} from '@usevon/ui'

type CreateEndpointDialogProps = {
  onCreated: () => void
  disabled?: boolean
}

export const CreateEndpointDialog = (props: CreateEndpointDialogProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const url = formData.get('url') as string
    const description = formData.get('description') as string

    setLoading(true)

    const { error } = await api.endpoints.post(
      { url, description: description || undefined },
      { fetch: { credentials: 'include' } }
    )

    setLoading(false)

    if (error) {
      console.error('Error creating endpoint:', error)
      return
    }

    setOpen(false)
    props.onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>Create Endpoint</DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Endpoint</DialogTitle>
            <DialogDescription>Add a new webhook endpoint to receive events.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>URL</FieldLabel>
              <Input name="url" type="url" placeholder="https://example.com/webhook" required />
              <FieldDescription>The URL where webhooks will be delivered</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input name="description" placeholder="Production webhook" />
              <FieldDescription>Optional description to identify this endpoint</FieldDescription>
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
