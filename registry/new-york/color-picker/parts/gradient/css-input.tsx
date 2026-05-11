"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, parseGradient } from "../../lib/gradient";

export const CssInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function CssInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  const [draft, setDraft] = React.useState(() => formatGradient(ctx.gradient));
  const [invalid, setInvalid] = React.useState(false);

  // Adjust state during render rather than via useEffect — same pattern as the
  // color `CssInput`, `HexField`, and `ChannelField`. Re-sync the draft only
  // when the input isn't focused so we don't clobber an in-progress edit.
  const [prevGradient, setPrevGradient] = React.useState(ctx.gradient);
  if (ctx.gradient !== prevGradient) {
    setPrevGradient(ctx.gradient);
    const inputEl = inputRef.current;
    const focused =
      typeof document !== "undefined" &&
      inputEl !== null &&
      document.activeElement === inputEl;
    if (!focused) {
      setDraft(formatGradient(ctx.gradient));
      setInvalid(false);
    }
  }

  const commit = () => {
    const parsed = parseGradient(draft);
    if (parsed) {
      ctx.setGradient(parsed);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <input
      ref={inputRef}
      data-slot="gradient-css-input"
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      aria-invalid={invalid}
      aria-label="Gradient CSS"
      className={cn(
        "h-8 w-full rounded-md border bg-background px-2 font-mono text-[10px]",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
