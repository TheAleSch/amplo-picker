"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  const { formatted, setFromString } = useColorPickerContext();
  const [draft, setDraft] = React.useState(formatted);
  const [error, setError] = React.useState(false);

  // Sync draft when canonical value changes externally (slider drags etc.)
  React.useEffect(() => {
    setDraft(formatted);
    setError(false);
  }, [formatted]);

  const commit = (value: string) => {
    const ok = setFromString(value.trim());
    setError(!ok);
  };

  return (
    <input
      ref={ref}
      data-slot="color-picker-input"
      type="text"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      value={draft}
      aria-invalid={error || undefined}
      aria-label="Color value"
      onChange={(e) => {
        setDraft(e.target.value);
        setError(false);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          setDraft(formatted);
          setError(false);
        }
      }}
      className={cn(
        "h-8 w-full rounded-md border bg-transparent px-2 font-mono text-xs shadow-xs outline-none",
        "border-input focus-visible:ring-1 focus-visible:ring-ring",
        error && "border-destructive focus-visible:ring-destructive",
        className,
      )}
      {...rest}
    />
  );
});
