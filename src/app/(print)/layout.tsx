import type { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background" id="main-content">
      {children}
    </main>
  );
}
