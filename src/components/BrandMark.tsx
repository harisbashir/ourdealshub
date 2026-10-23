/** Tag mark in the current accent colour (decorative; pair with the name). */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <rect width="64" height="64" rx="14" fill="var(--brand)" />
      <path
        d="M14 30.5V17a3 3 0 0 1 3-3h13.5a3 3 0 0 1 2.1.9l17.2 17.2a3 3 0 0 1 0 4.2L36.3 49.8a3 3 0 0 1-4.2 0L14.9 32.6a3 3 0 0 1-.9-2.1Z"
        fill="var(--on-brand)"
      />
      <circle cx="23" cy="23" r="3.6" fill="var(--brand)" />
    </svg>
  );
}
