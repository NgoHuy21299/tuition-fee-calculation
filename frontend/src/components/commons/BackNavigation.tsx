import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";

export type BackNavigationProps = {
  to: string;
  text?: string;
  className?: string;
};

export default function BackNavigation({
  to,
  text = "Quay về danh sách",
  className,
}: BackNavigationProps) {
  return (
    <div className={cn("w-full", className)}>
      <Link
        to={to}
        className={
          // Subtle, non-intrusive nav control matching dark theme
          "inline-flex items-center gap-2 text-sm text-gray-300 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white transition-colors"
        }
        aria-label={text}
      >
        <ArrowLeft size={16} className="shrink-0" />
        <span>{text}</span>
      </Link>
    </div>
  );
}
