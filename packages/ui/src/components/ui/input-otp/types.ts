/**
 * InputOTP Types
 * Based on input-otp by @guilhermerodz
 * https://github.com/guilhermerodz/input-otp
 */

import type { Ref } from 'react'

type InputOTPBaseProps = {
  value?: string
  defaultValue?: string
  onChange?: (newValue: string) => unknown
  maxLength: number
  groupSize?: number
  pattern?: string | RegExp
  onComplete?: (value: string) => unknown
  disabled?: boolean
  error?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'tel'
  className?: string
  ref?: Ref<HTMLInputElement>
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

export type InputOTPProps = InputOTPBaseProps
