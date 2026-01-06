/**
 * InputOTP Component
 * Based on input-otp by @guilhermerodz
 * https://github.com/guilhermerodz/input-otp
 */

"use client";

import type { ChangeEvent } from "react";
import { Fragment, useImperativeHandle, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { InputOTPProps } from "@/components/ui/input-otp/types";
import { cn } from "@/lib/utils";

export const InputOTP = (props: InputOTPProps) => {
  const [internalValue, setInternalValue] = useState(
    typeof props.defaultValue === "string" ? props.defaultValue : ""
  );
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(props.ref, () => inputRef.current as HTMLInputElement);

  const value = props.value ?? internalValue;
  const getRegexp = () => {
    if (!props.pattern) {
      return null;
    }
    if (typeof props.pattern === "string") {
      return new RegExp(props.pattern);
    }
    return props.pattern;
  };
  const regexp = getRegexp();
  // groupSize of 0 or undefined means no grouping (all in one row)
  const groupSize = props.groupSize || props.maxLength;
  const insertionPoint = Math.min(value.length, props.maxLength - 1);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value.slice(0, props.maxLength);
    if (newValue.length > 0 && regexp && !regexp.test(newValue)) {
      e.preventDefault();
      return;
    }
    props.onChange?.(newValue);
    setInternalValue(newValue);

    if (newValue.length === props.maxLength && value.length < props.maxLength) {
      props.onComplete?.(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (inputRef.current) {
      const pos = inputRef.current.value.length;
      inputRef.current.setSelectionRange(pos, pos);
    }
  };

  const slots = Array.from({ length: props.maxLength }).map((_, i) => ({
    char: value[i] ?? null,
    isActive: isFocused && i === insertionPoint,
    hasFakeCaret: isFocused && i === insertionPoint && !value[i],
  }));

  const groups: (typeof slots)[] = [];
  for (let i = 0; i < slots.length; i += groupSize) {
    groups.push(slots.slice(i, i + groupSize));
  }

  return (
    <div
      className={cn(
        "relative flex select-none items-center gap-2",
        props.disabled ? "cursor-default" : "cursor-text",
        props.className
      )}
      data-slot="input-otp"
    >
      {groups.map((group, groupIdx) => (
        <Fragment key={groupIdx}>
          {groupIdx > 0 && (
            <span className="text-muted-foreground">-</span>
          )}
          <div className="flex flex-1 items-center gap-1.5">
            {group.map((slot, slotIdx) => (
              <Input
                key={slotIdx}
                value={slot.char || ""}
                readOnly
                tabIndex={-1}
                aria-invalid={props.error || undefined}
                className={cn(
                  "h-12 flex-1 px-0 text-center font-mono text-xl [&_input]:text-center [&_input]:text-xl",
                  slot.isActive && !props.error && "border-ring ring-[3px] ring-ring/24",
                  slot.isActive && props.error && "ring-[3px] ring-destructive/24"
                )}
                data-active={slot.isActive || undefined}
                data-slot="input-otp-slot"
              />
            ))}
          </div>
        </Fragment>
      ))}
      <Input
        autoComplete={props.autoComplete || "one-time-code"}
        className="pointer-events-auto absolute inset-0 text-transparent caret-transparent selection:bg-transparent"
        disabled={props.disabled}
        inputMode={props.inputMode ?? "text"}
        maxLength={props.maxLength}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        onChange={handleChange}
        onFocus={(e) => {
          handleFocus();
          props.onFocus?.(e);
        }}
        onPaste={props.onPaste}
        pattern={regexp?.source}
        ref={inputRef}
        unstyled
        value={value}
      />
    </div>
  );
};
