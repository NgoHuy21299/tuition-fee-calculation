import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base appearance
        "flex h-9 w-full min-w-0 rounded-md border px-3 py-2 text-sm outline-none transition-colors",
        // Background + border (dark-only)
        "bg-white/5 border-gray-800 placeholder:text-gray-400",
        // Selection color
        "selection:bg-white selection:text-black",
        // Focus states subtle
        "focus-visible:border-gray-700 focus-visible:ring-2 focus-visible:ring-gray-700/50",
        // Invalid states
        "aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-700/40",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
