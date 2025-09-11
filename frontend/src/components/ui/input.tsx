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
        // Background + border (light/dark)
        "bg-gray-50 border-gray-200 placeholder:text-gray-500",
        "dark:bg-white/5 dark:border-gray-800 dark:placeholder:text-gray-400",
        // Selection color
        "selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black",
        // Focus states subtle
        "focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-300",
        "dark:focus-visible:border-gray-700 dark:focus-visible:ring-gray-700/50",
        // Invalid states
        "aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-300",
        "dark:aria-invalid:border-red-400 dark:aria-invalid:focus-visible:ring-red-700/40",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
