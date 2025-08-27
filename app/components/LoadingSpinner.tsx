type Props = {
  size?: number; // pixel size (maps to --spinner-size)
  padding?: number; // pixel padding (maps to --spinner-padding)
  background?: string; // CSS color (maps to --spinner-bg), defaults to currentColor
  className?: string;
  title?: string;
};

export default function LoadingSpinner({
  size = 18,
  padding,
  background,
  className = "",
  title = "Đang tải",
}: Props) {
  // Use CSS custom properties so styles can be overridden per-instance
  const style: React.CSSProperties = {
    ...(size != null ? ({ ["--spinner-size" as any]: `${size}px` } as any) : {}),
    ...(padding != null
      ? ({ ["--spinner-padding" as any]: `${padding}px` } as any)
      : {}),
    ...(background
      ? ({ ["--spinner-bg" as any]: background } as any)
      : {}),
  };

  return (
    <span
      className={`loader inline-block align-middle ${className}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={title}
      title={title}
    />
  );
}
