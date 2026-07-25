"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, parseGradient } from "../../lib/gradient";
import { FieldInput, FieldShell } from "../field";

export const CssInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function CssInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  const [draft, setDraft] = React.useState(() => formatGradient(ctx.gradient));
  const [invalid, setInvalid] = React.useState(false);
  // "The user has typed since the last sync/commit." Distinct from "the draft
  // differs from the current gradient": an external update while the field is
  // merely *focused* also makes those differ, and treating that as an edit is
  // what let a stale draft silently overwrite the newer value on blur.
  const [dirty, setDirty] = React.useState(false);

  // Adjust state during render rather than via useEffect — same pattern as the
  // color `CssInput`, `HexField`, and `ChannelField`. Re-sync the draft unless
  // there is an actual in-progress edit to clobber.
  const [prevGradient, setPrevGradient] = React.useState(ctx.gradient);
  if (ctx.gradient !== prevGradient) {
    setPrevGradient(ctx.gradient);
    const inputEl = inputRef.current;
    const focused =
      typeof document !== "undefined" &&
      inputEl !== null &&
      document.activeElement === inputEl;
    if (!focused || !dirty) {
      setDraft(formatGradient(ctx.gradient));
      setInvalid(false);
      setDirty(false);
    }
  }

  const commit = () => {
    // Nothing typed — the draft is just a mirror of the current gradient, so
    // committing it would at best be a no-op and at worst re-assert a value
    // that an external update has since replaced.
    if (!dirty) {
      setInvalid(false);
      return;
    }
    const parsed = parseGradient(draft);
    if (parsed) {
      ctx.setGradient(parsed);
      setInvalid(false);
      setDirty(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <FieldShell
      data-slot="gradient-css-input"
      className={cn(
        "w-full",
        invalid && "border-destructive focus-within:ring-destructive",
        className,
      )}
    >
      <FieldInput
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        aria-invalid={invalid}
        aria-label="Gradient CSS"
        className="flex-1 px-2 text-left text-[10px]"
        {...rest}
      />
    </FieldShell>
  );
});
