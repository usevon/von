/**
 * InputOTP Component
 * Based on input-otp by @guilhermerodz
 * https://github.com/guilhermerodz/input-otp
 *
 * Simplified fork without password manager badge handling.
 */

'use client'

import * as React from 'react'
import { cn } from '../../../lib/utils'
import type { InputOTPProps, RenderProps, SlotProps } from './types'

function usePrevious<T>(value: T) {
  const ref = React.useRef<T>()
  React.useEffect(() => {
    ref.current = value
  })
  return ref.current
}

function syncTimeouts(cb: () => void): number[] {
  const t1 = window.setTimeout(cb, 0)
  const t2 = window.setTimeout(cb, 10)
  const t3 = window.setTimeout(cb, 50)
  return [t1, t2, t3]
}

export const InputOTPContext = React.createContext<RenderProps>({} as RenderProps)

export const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  (
    {
      value: uncheckedValue,
      onChange: uncheckedOnChange,
      maxLength,
      textAlign = 'left',
      pattern,
      placeholder,
      inputMode = 'text',
      onComplete,
      pasteTransformer,
      containerClassName,
      render,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      typeof props.defaultValue === 'string' ? props.defaultValue : ''
    )

    const value = uncheckedValue ?? internalValue
    const previousValue = usePrevious(value)
    const onChange = React.useCallback(
      (newValue: string) => {
        uncheckedOnChange?.(newValue)
        setInternalValue(newValue)
      },
      [uncheckedOnChange]
    )

    const regexp = React.useMemo(
      () => (pattern ? (typeof pattern === 'string' ? new RegExp(pattern) : pattern) : null),
      [pattern]
    )

    const inputRef = React.useRef<HTMLInputElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const initialLoadRef = React.useRef({
      value,
      onChange,
      isIOS: typeof window !== 'undefined' && window?.CSS?.supports?.('-webkit-touch-callout', 'none'),
    })
    const inputMetadataRef = React.useRef<{
      prev: [number | null, number | null, 'none' | 'forward' | 'backward']
    }>({
      prev: [inputRef.current?.selectionStart ?? null, inputRef.current?.selectionEnd ?? null, inputRef.current?.selectionDirection ?? 'none'],
    })

    React.useImperativeHandle(ref, () => inputRef.current!, [])

    const [isHoveringInput, setIsHoveringInput] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [mirrorSelectionStart, setMirrorSelectionStart] = React.useState<number | null>(null)
    const [mirrorSelectionEnd, setMirrorSelectionEnd] = React.useState<number | null>(null)

    React.useEffect(() => {
      const input = inputRef.current
      const container = containerRef.current
      if (!input || !container) return

      if (initialLoadRef.current.value !== input.value) {
        initialLoadRef.current.onChange(input.value)
      }

      inputMetadataRef.current.prev = [input.selectionStart, input.selectionEnd, input.selectionDirection ?? 'none']

      function onDocumentSelectionChange() {
        if (document.activeElement !== input) {
          setMirrorSelectionStart(null)
          setMirrorSelectionEnd(null)
          return
        }

        const _s = input!.selectionStart
        const _e = input!.selectionEnd
        const _dir = input!.selectionDirection
        const _ml = input!.maxLength
        const _val = input!.value
        const _prev = inputMetadataRef.current.prev

        let start = -1
        let end = -1
        let direction: 'forward' | 'backward' | 'none' | undefined = undefined

        if (_val.length !== 0 && _s !== null && _e !== null) {
          const isSingleCaret = _s === _e
          const isInsertMode = _s === _val.length && _val.length < _ml

          if (isSingleCaret && !isInsertMode) {
            const c = _s
            if (c === 0) {
              start = 0
              end = 1
              direction = 'forward'
            } else if (c === _ml) {
              start = c - 1
              end = c
              direction = 'backward'
            } else if (_ml > 1 && _val.length > 1) {
              let offset = 0
              if (_prev[0] !== null && _prev[1] !== null) {
                direction = c < _prev[1] ? 'backward' : 'forward'
                const wasPreviouslyInserting = _prev[0] === _prev[1] && _prev[0] < _ml
                if (direction === 'backward' && !wasPreviouslyInserting) {
                  offset = -1
                }
              }
              start = offset + c
              end = offset + c + 1
            }
          }

          if (start !== -1 && end !== -1 && start !== end) {
            input!.setSelectionRange(start, end, direction)
          }
        }

        const s = start !== -1 ? start : _s
        const e = end !== -1 ? end : _e
        const dir = direction ?? _dir ?? 'none'
        setMirrorSelectionStart(s)
        setMirrorSelectionEnd(e)
        inputMetadataRef.current.prev = [s, e, dir]
      }

      document.addEventListener('selectionchange', onDocumentSelectionChange, { capture: true })
      onDocumentSelectionChange()
      if (document.activeElement === input) setIsFocused(true)

      if (!document.getElementById('input-otp-style')) {
        const styleEl = document.createElement('style')
        styleEl.id = 'input-otp-style'
        document.head.appendChild(styleEl)

        if (styleEl.sheet) {
          const autofillStyles =
            'background: transparent !important; color: transparent !important; border-color: transparent !important; opacity: 0 !important; box-shadow: none !important; -webkit-box-shadow: none !important; -webkit-text-fill-color: transparent !important;'

          try {
            styleEl.sheet.insertRule('[data-input-otp]::selection { background: transparent !important; color: transparent !important; }')
            styleEl.sheet.insertRule(`[data-input-otp]:autofill { ${autofillStyles} }`)
            styleEl.sheet.insertRule(`[data-input-otp]:-webkit-autofill { ${autofillStyles} }`)
            styleEl.sheet.insertRule(`@supports (-webkit-touch-callout: none) { [data-input-otp] { letter-spacing: -.6em !important; font-weight: 100 !important; font-stretch: ultra-condensed; font-optical-sizing: none !important; left: -1px !important; right: 1px !important; } }`)
          } catch {
            // Ignore CSS rule insertion errors
          }
        }
      }

      const updateRootHeight = () => {
        container.style.setProperty('--root-height', `${input.clientHeight}px`)
      }
      updateRootHeight()
      const resizeObserver = new ResizeObserver(updateRootHeight)
      resizeObserver.observe(input)

      return () => {
        document.removeEventListener('selectionchange', onDocumentSelectionChange, { capture: true })
        resizeObserver.disconnect()
      }
    }, [])

    React.useEffect(() => {
      syncTimeouts(() => {
        inputRef.current?.dispatchEvent(new Event('input'))
        const s = inputRef.current?.selectionStart
        const e = inputRef.current?.selectionEnd
        const dir = inputRef.current?.selectionDirection
        if (s !== null && e !== null) {
          setMirrorSelectionStart(s ?? null)
          setMirrorSelectionEnd(e ?? null)
          inputMetadataRef.current.prev = [s ?? null, e ?? null, dir ?? 'none']
        }
      })
    }, [value, isFocused])

    React.useEffect(() => {
      if (previousValue === undefined) return
      if (value !== previousValue && previousValue.length < maxLength && value.length === maxLength) {
        onComplete?.(value)
      }
    }, [maxLength, onComplete, previousValue, value])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.currentTarget.value.slice(0, maxLength)
        if (newValue.length > 0 && regexp && !regexp.test(newValue)) {
          e.preventDefault()
          return
        }
        const maybeHasDeleted = typeof previousValue === 'string' && newValue.length < previousValue.length
        if (maybeHasDeleted) {
          document.dispatchEvent(new Event('selectionchange'))
        }
        onChange(newValue)
      },
      [maxLength, onChange, previousValue, regexp]
    )

    const handleFocus = React.useCallback(() => {
      if (inputRef.current) {
        const start = Math.min(inputRef.current.value.length, maxLength - 1)
        const end = inputRef.current.value.length
        inputRef.current.setSelectionRange(start, end)
        setMirrorSelectionStart(start)
        setMirrorSelectionEnd(end)
      }
      setIsFocused(true)
    }, [maxLength])

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const input = inputRef.current
        if (!pasteTransformer && (!initialLoadRef.current.isIOS || !e.clipboardData || !input)) {
          return
        }

        const _content = e.clipboardData.getData('text/plain')
        const content = pasteTransformer ? pasteTransformer(_content) : _content
        e.preventDefault()

        const start = input?.selectionStart ?? 0
        const end = input?.selectionEnd ?? 0
        const isReplacing = start !== end

        const newValueUncapped = isReplacing
          ? value.slice(0, start) + content + value.slice(end)
          : value.slice(0, start) + content + value.slice(start)
        const newValue = newValueUncapped.slice(0, maxLength)

        if (newValue.length > 0 && regexp && !regexp.test(newValue)) {
          return
        }

        input!.value = newValue
        onChange(newValue)

        const _start = Math.min(newValue.length, maxLength - 1)
        const _end = newValue.length
        input!.setSelectionRange(_start, _end)
        setMirrorSelectionStart(_start)
        setMirrorSelectionEnd(_end)
      },
      [maxLength, onChange, pasteTransformer, regexp, value]
    )

    const rootStyle = React.useMemo<React.CSSProperties>(
      () => ({
        position: 'relative',
        cursor: props.disabled ? 'default' : 'text',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'none',
      }),
      [props.disabled]
    )

    const inputStyle = React.useMemo<React.CSSProperties>(
      () => ({
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        textAlign,
        opacity: '1',
        color: 'transparent',
        pointerEvents: 'all',
        background: 'transparent',
        caretColor: 'transparent',
        border: '0 solid transparent',
        outline: '0 solid transparent',
        boxShadow: 'none',
        lineHeight: '1',
        letterSpacing: '-.5em',
        fontSize: 'var(--root-height)',
        fontFamily: 'monospace',
        fontVariantNumeric: 'tabular-nums',
      }),
      [textAlign]
    )

    const contextValue = React.useMemo<RenderProps>(() => {
      return {
        slots: Array.from({ length: maxLength }).map((_, slotIdx) => {
          const isActive =
            isFocused &&
            mirrorSelectionStart !== null &&
            mirrorSelectionEnd !== null &&
            ((mirrorSelectionStart === mirrorSelectionEnd && slotIdx === mirrorSelectionStart) ||
              (slotIdx >= mirrorSelectionStart && slotIdx < mirrorSelectionEnd))

          const char = value[slotIdx] !== undefined ? value[slotIdx] : null
          const placeholderChar = value[0] !== undefined ? null : placeholder?.[slotIdx] ?? null

          return {
            char,
            placeholderChar,
            isActive,
            hasFakeCaret: isActive && char === null,
          }
        }),
        isFocused,
        isHovering: !props.disabled && isHoveringInput,
      }
    }, [isFocused, isHoveringInput, maxLength, mirrorSelectionEnd, mirrorSelectionStart, placeholder, props.disabled, value])

    const renderedInput = (
      <input
        autoComplete={props.autoComplete || 'one-time-code'}
        {...props}
        data-input-otp
        data-input-otp-mss={mirrorSelectionStart}
        data-input-otp-mse={mirrorSelectionEnd}
        inputMode={inputMode}
        pattern={regexp?.source}
        style={inputStyle}
        maxLength={maxLength}
        value={value}
        ref={inputRef}
        onPaste={(e) => {
          handlePaste(e)
          props.onPaste?.(e)
        }}
        onChange={handleChange}
        onMouseOver={(e) => {
          setIsHoveringInput(true)
          props.onMouseOver?.(e)
        }}
        onMouseLeave={(e) => {
          setIsHoveringInput(false)
          props.onMouseLeave?.(e)
        }}
        onFocus={(e) => {
          handleFocus()
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
      />
    )

    const renderedChildren = render ? (
      render(contextValue)
    ) : (
      <InputOTPContext.Provider value={contextValue}>{children}</InputOTPContext.Provider>
    )

    return (
      <div ref={containerRef} data-input-otp-container data-slot="input-otp" style={rootStyle} className={containerClassName}>
        {renderedChildren}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{renderedInput}</div>
      </div>
    )
  }
)
InputOTP.displayName = 'InputOTP'

function InputOTPGroup(props: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" className={cn('flex items-center', props.className)} {...props} />
}

function InputOTPSlot(props: SlotProps & { className?: string }) {
  return (
    <div
      data-slot="input-otp-slot"
      data-active={props.isActive || undefined}
      className={cn(
        'relative flex h-12 w-10 items-center justify-center border-y border-r border-input text-xl font-mono transition-all first:rounded-l-md first:border-l last:rounded-r-md',
        props.isActive && 'z-10 ring-2 ring-ring',
        props.className
      )}
    >
      {props.char ?? props.placeholderChar}
      {props.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator(props: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="separator" className={cn('flex items-center justify-center', props.className)} {...props}>
      {props.children ?? <span className="text-muted-foreground">-</span>}
    </div>
  )
}

export { InputOTPGroup, InputOTPSlot, InputOTPSeparator }
