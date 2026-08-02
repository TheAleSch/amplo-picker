"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  GradientPickerContext,
  GradientStopEditorContext,
  useGradientStopEditor,
  type GradientStopEditorRenderer,
} from "../../contexts/gradient";
import {
  useGradientPicker,
  type UseGradientPickerProps,
} from "../../hooks/use-gradient-picker";

export interface RootProps
  extends UseGradientPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /**
   * Editor mounted around each `<Bar editOnClick>` stop handle. Each barrel
   * (`GradientPicker` / `GradientPickerBase`) injects its own variant's editor
   * as the default; pass this to substitute your own. Omitted, the editor is
   * inherited from an enclosing provider — and with none (a deep-imported
   * engine `Root`), the Bar renders bare handles.
   */
  stopEditor?: GradientStopEditorRenderer;
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  {
    value,
    defaultValue,
    onValueChange,
    defaultStopColorFormat,
    stopEditor,
    className,
    children,
    ...rest
  },
  ref,
) {
  const state = useGradientPicker({
    value,
    defaultValue,
    onValueChange,
    defaultStopColorFormat,
  });
  // Omitting the prop inherits whatever editor an outer provider (a barrel's
  // `FillPicker.Pane`, say) already injected, rather than blanking it — a
  // deep-imported engine Root nested in a wired-up tree keeps its editor.
  const inherited = useGradientStopEditor();
  const editor = stopEditor ?? inherited;
  return (
    <GradientStopEditorContext.Provider value={editor}>
      <GradientPickerContext.Provider value={state}>
        <div
          ref={ref}
          data-slot="gradient-picker"
          className={cn(
            "flex w-full max-w-[280px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm",
            className,
          )}
          {...rest}
        >
          {children}
        </div>
      </GradientPickerContext.Provider>
    </GradientStopEditorContext.Provider>
  );
});
