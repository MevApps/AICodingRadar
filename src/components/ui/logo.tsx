export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-accent"
      >
        <circle cx="14" cy="14" r="4" fill="currentColor" />
        <path
          d="M14 6a8 8 0 0 1 8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M14 2a12 12 0 0 1 12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      <span className="font-heading text-xl font-bold tracking-tight">
        Coding Radar
      </span>
    </div>
  );
}
