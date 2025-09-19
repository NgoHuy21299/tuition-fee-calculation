import * as React from "react";
import { cn } from "../../lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
  // Variant to adjust visual styles; 'blur-animation' removes default padding and adds a subtle blur/transition
  variant?: "blur-animation" | undefined;
};

export function Card({ className, children, variant, ...props }: CardProps) {
  const base = "rounded-lg border border-gray-700 bg-gray-900/70 shadow-lg";
  const blurAnim = "backdrop-blur transition-all duration-200 ease-in-out";
  const padding = variant === "blur-animation" ? "" : "p-4";

  return (
    <div
      className={cn(
        base,
        variant === "blur-animation" ? `${blurAnim}` : "backdrop-blur",
        // Default padding is small to suit dashboard cards; removed for blur-animation variant
        padding,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-medium", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}
