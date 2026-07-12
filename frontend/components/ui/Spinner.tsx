export function Spinner({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 align-middle ${
        dark
          ? "border-primary/25 border-t-primary"
          : "border-white/50 border-t-white"
      } ${className}`}
    />
  );
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span
        aria-hidden="true"
        className="inline-block h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-primary/25 border-t-primary"
      />
    </div>
  );
}
