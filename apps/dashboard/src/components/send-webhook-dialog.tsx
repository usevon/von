import { useState } from 'react'
import { api } from '@/lib/api'
import { useEndpoints } from '@usevon/react/hooks'
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
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from '@von/ui'

type SendWebhookDialogProps = {
  onSent: () => void
  disabled?: boolean
}

export const SendWebhookDialog = (props: SendWebhookDialogProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const { endpoints, isLoading: endpointsLoading } = useEndpoints()

  const enabledEndpoints = endpoints.filter((e) => e.enabled)
  const hasNoEndpoints = !endpointsLoading && enabledEndpoints.length === 0

  const getPlaceholderLabel = () => {
    if (endpointsLoading) return 'Loading...'
    if (hasNoEndpoints) return 'No endpoints available'
    return 'Select an endpoint'
  }

  const items = [
    { label: getPlaceholderLabel(), value: null },
    ...enabledEndpoints.map((e) => ({ label: e.url, value: e.id })),
  ]

  const validateJson = (value: string): boolean => {
    if (!value.trim()) {
      setJsonError('Payload is required')
      return false
    }
    try {
      JSON.parse(value)
      setJsonError(null)
      return true
    } catch {
      setJsonError('Invalid JSON')
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const eventType = formData.get('eventType') as string
    const payloadJson = formData.get('payload') as string
    const endpointValue = formData.get('endpoint') as string
    const endpoint = endpointValue ? JSON.parse(endpointValue) : null

    if (!endpoint?.value) {
      return
    }

    if (!validateJson(payloadJson)) {
      return
    }

    setLoading(true)

    const { error } = await api.webhooks.post(
      {
        eventType,
        payload: JSON.parse(payloadJson),
        endpointIds: [endpoint.value],
      },
      { fetch: { credentials: 'include' } }
    )

    setLoading(false)

    if (error) {
      console.error('Error sending webhook:', error)
      return
    }

    setOpen(false)
    setJsonError(null)
    props.onSent()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>Send Test</DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Test Webhook</DialogTitle>
            <DialogDescription>Send a test webhook event to an endpoint.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>Endpoint</FieldLabel>
              <Select
                aria-label="Select endpoint"
                defaultValue={items[0]}
                disabled={endpointsLoading || hasNoEndpoints}
                items={items}
                name="endpoint"
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <FieldDescription>
                {hasNoEndpoints
                  ? 'Create an endpoint first to send test webhooks'
                  : 'The endpoint to receive the test webhook'}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Event Type</FieldLabel>
              <Input name="eventType" placeholder="order.created" required />
              <FieldDescription>The type of event being sent</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Payload</FieldLabel>
              <Textarea
                name="payload"
                placeholder='{"orderId": "123", "amount": 99.99}'
                required
                onChange={(e) => validateJson(e.target.value)}
              />
              {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
              <FieldDescription>JSON payload to send with the webhook</FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter variant="bare">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={loading || !!jsonError}>
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  )
}
