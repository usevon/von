/**
 * InputOTP Component
 * Based on input-otp by @guilhermerodz
 * https://github.com/guilhermerodz/input-otp
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { InputOTPProps } from './types'

export const InputOTP = (props: InputOTPProps) => {
  const [internalValue, setInternalValue] = React.useState(
    typeof props.defaultValue === 'string' ? props.defaultValue : ''
  )
  const [isFocused, setIsFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useImperativeHandle(props.ref, () => inputRef.current!)

  const value = props.value ?? internalValue
  const regexp = props.pattern ? (typeof props.pattern === 'string' ? new RegExp(props.pattern) : props.pattern) : null
  const groupSize = props.groupSize ?? 4
  const insertionPoint = Math.min(value.length, props.maxLength - 1)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value.slice(0, props.maxLength)
    if (newValue.length > 0 && regexp && !regexp.test(newValue)) {
      e.preventDefault()
      return
    }
    props.onChange?.(newValue)
    setInternalValue(newValue)

    if (newValue.length === props.maxLength && value.length < props.maxLength) {
      props.onComplete?.(newValue)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    if (inputRef.current) {
      const pos = inputRef.current.value.length
      inputRef.current.setSelectionRange(pos, pos)
    }
  }

  const slots = Array.from({ length: props.maxLength }).map((_, i) => ({
    char: value[i] ?? null,
    isActive: isFocused && i === insertionPoint,
    hasFakeCaret: isFocused && i === insertionPoint && !value[i],
  }))

  const groups: typeof slots[] = []
  for (let i = 0; i < slots.length; i += groupSize) {
    groups.push(slots.slice(i, i + groupSize))
  }

  return (
    <div
      data-slot="input-otp"
      className={cn(
        'relative flex items-center select-none',
        props.disabled ? 'cursor-default' : 'cursor-text',
        props.className
      )}
    >
      {groups.map((group, groupIdx) => (
        <React.Fragment key={groupIdx}>
          {groupIdx > 0 && (
            <Separator orientation="horizontal" className="mx-1.5" style={{ width: '0.75rem' }} />
          )}
          <div className="flex items-center">
            {group.map((slot, slotIdx) => (
              <div
                key={slotIdx}
                data-slot="input-otp-slot"
                data-active={slot.isActive || undefined}
                className={cn(
                  'relative flex size-9 items-center justify-center border-y border-r border-input font-mono first:rounded-l-md first:border-l last:rounded-r-md',
                  slot.isActive && 'z-10 ring-2 ring-ring'
                )}
              >
                {slot.char}
                {slot.hasFakeCaret && (
                  <span className="pointer-events-none absolute h-4 w-px animate-caret-blink bg-foreground" />
                )}
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
      <Input
        unstyled
        autoComplete={props.autoComplete || 'one-time-code'}
        inputMode={props.inputMode ?? 'text'}
        pattern={regexp?.source}
        className="absolute inset-0 text-transparent caret-transparent pointer-events-auto selection:bg-transparent"
        maxLength={props.maxLength}
        value={value}
        disabled={props.disabled}
        ref={inputRef}
        onPaste={props.onPaste}
        onChange={handleChange}
        onFocus={(e) => {
          handleFocus()
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
      />
    </div>
  )
}
