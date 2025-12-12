/**
 * InputOTP Types
 * Based on input-otp by @guilhermerodz
 * https://github.com/guilhermerodz/input-otp
 */

export type SlotProps = {
  isActive: boolean
  char: string | null
  placeholderChar: string | null
  hasFakeCaret: boolean
}

export type RenderProps = {
  slots: SlotProps[]
  isFocused: boolean
  isHovering: boolean
}

type OverrideProps<T, R> = Omit<T, keyof R> & R

type InputOTPBaseProps = OverrideProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  {
    value?: string
    onChange?: (newValue: string) => unknown
    maxLength: number
    textAlign?: 'left' | 'center' | 'right'
    onComplete?: (value: string) => unknown
    pasteTransformer?: (pasted: string) => string
    containerClassName?: string
  }
>

type InputOTPRenderFn = (props: RenderProps) => React.ReactNode

export type InputOTPProps = InputOTPBaseProps &
  (
    | { render: InputOTPRenderFn; children?: never }
    | { render?: never; children: React.ReactNode }
  )
