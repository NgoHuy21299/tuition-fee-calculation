export default function LoadingSpinner({ size = 20, padding = 2 }: { size?: number; padding?: number }) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderWidth: Math.max(2, Math.floor(size / 10)),
    padding,
  };
  return (
    <span
      className="inline-block rounded-full border-current border-t-transparent animate-spin"
      style={style}
      aria-label="Loading"
      role="status"
    />
  );
}
