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
  const [draft, setDraft] = React.useState(() => formatGradient(ctx.gradient));
  const [invalid, setInvalid] = React.useState(false);

  React.useEffect(() => {
    setDraft(formatGradient(ctx.gradient));
    setInvalid(false);
  }, [ctx.gradient]);

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
      ref={ref}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      aria-invalid={invalid}
      className={cn(
        "h-8 w-full rounded-md border bg-background px-2 font-mono text-[10px]",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
