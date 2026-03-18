import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

const highlights = [
  "Log tickets in under 10 seconds",
  "Rich text notes with attachments",
  "Export to PDF, CSV, or JSON",
  "Full-text search across all reports",
  "Daily reminders so nothing slips",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2" id="main-content">
      {/* ── Left panel — branding ──────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[hsl(193,45%,14%)] p-12 text-white lg:flex">
        {/* grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:32px_32px] opacity-10"
        />
        {/* glow blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <FileSearch className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            DailyReport
          </span>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-widest text-white/50">
              Built for engineers
            </p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Capture the work
              <br />
              while it&apos;s still fresh.
            </h2>
            <p className="max-w-xs text-base leading-relaxed text-white/60">
              Stop losing track of what you shipped today. DailyReport makes
              daily logging fast, searchable, and exportable.
            </p>
          </div>

          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/30 text-primary">
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-sm italic leading-relaxed text-white/70">
            &ldquo;Finally a place to put everything that happened today before
            I forget it by tomorrow morning.&rdquo;
          </p>
          <p className="mt-3 text-xs font-medium text-white/40">
            — A very forgetful engineer
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-8">
        {/* mobile-only top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/8 to-transparent lg:hidden"
        />

        {/* mobile logo */}
        <div className="relative mb-10 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSearch className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">DailyReport</span>
        </div>

        <div className="relative w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
