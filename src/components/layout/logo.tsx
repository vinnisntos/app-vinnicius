import { cn } from "@/lib/utils";

/**
 * Marca minimalista: quadrado com o pulso de "vida" (ECG) — só forma
 * geométrica e cor, sem ilustração/foto, seguindo docs/05-design-system.md.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="24" height="24" rx="6" fill="#9333EA" />
      <path
        d="M3.5 13h3.2l2-5.2L12 18l2.3-5h6.2"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className="size-6" />
      <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
        Life OS
      </span>
    </div>
  );
}
