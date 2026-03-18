import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSearch,
  Hash,
  LayoutDashboard,
  Paperclip,
  Search,
  Shield,
  Sparkles,
  Tag,
  Upload,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: ClipboardList,
    title: "Task & Report Logging",
    description:
      "Log daily work entries with ticket number, title, description, story points, and rich-text notes. Multiple tasks per day, each with full detail.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Search,
    title: "Powerful Search & Filter",
    description:
      "Full-text search across all fields with Ctrl+K. Filter by date range, status, tags. Sort by any column. URL-synced state for bookmarkable views.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "Dashboard & Analytics",
    description:
      "See your story points, task counts, and daily activity at a glance. Time-based nudges remind you to log before the day ends.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Paperclip,
    title: "File Attachments",
    description:
      "Attach screenshots, logs, and docs to any task. Drag-and-drop upload with image thumbnails and lightbox preview.",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    icon: Tag,
    title: "Tags & Status Labels",
    description:
      "Organise tasks with color-coded tags and statuses (Todo, In Progress, Done, Blocked). Bulk-update multiple tasks at once.",
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    icon: Download,
    title: "Export & Print",
    description:
      "Export any date range to CSV, JSON, or a formatted PDF report. Print-friendly view for sharing or archiving your daily output.",
    color: "bg-sky-500/10 text-sky-600",
  },
  {
    icon: Upload,
    title: "Import History",
    description:
      "Bring in existing data via CSV or JSON. Column-mapping step, 5-row preview, and a full error report so nothing is lost.",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Browser and email reminders fire at your configured time if you haven't logged anything yet. Configurable per user.",
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    icon: Shield,
    title: "Admin Console",
    description:
      "Full admin dashboard for user management, content moderation, app configuration, system health, and announcement broadcasting.",
    color: "bg-teal-500/10 text-teal-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Log in and open the dashboard",
    description:
      "Your personalised dashboard shows today's summary, recent tasks, story point totals, and a nudge if you haven't logged yet.",
  },
  {
    number: "02",
    title: "Add a task in seconds",
    description:
      "Hit Ctrl+N or the Quick Add button. Fill in ticket number and title — that's enough to save. Expand for description, story points, tags, attachments, and rich-text notes.",
  },
  {
    number: "03",
    title: "Review, search, and export",
    description:
      "Find any task instantly with full-text search. Filter by date range, status, or tags. Export to PDF, CSV, or JSON for your weekly report.",
  },
];

const techStack = [
  "Next.js 14",
  "React 18",
  "TypeScript 5",
  "Prisma 6",
  "PostgreSQL",
  "NextAuth 5",
  "Tailwind CSS",
  "Radix UI",
  "TanStack Query",
  "Tiptap",
  "Recharts",
  "pdfkit",
];

export default function HomePage() {
  return (
    <div className="min-h-screen" id="main-content">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileSearch className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              DailyReport
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a
              className="transition-colors hover:text-foreground"
              href="#features"
            >
              Features
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="#tech-stack"
            >
              Tech stack
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
        {/* subtle grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:32px_32px] opacity-40"
        />
        {/* glow blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-16 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <Badge className="mb-6 gap-1.5" variant="accent">
            <Sparkles className="h-3 w-3" />
            Production-ready · Full-stack · Open source
          </Badge>

          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Stop forgetting{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              what you did today.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            DailyReport is a personal productivity app for engineers and
            technical teams. Log ticket work, write rich daily notes, and export
            polished reports — all in under 10 seconds per entry.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/register">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base"
            >
              <Link href="/login">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Open dashboard
              </Link>
            </Button>
          </div>

          {/* social proof strip */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {[
              "Rich text editor",
              "CSV · JSON · PDF export",
              "Full-text search",
              "Admin console",
              "Dark mode",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <Badge className="mb-4" variant="default">
              Everything you need
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for how engineers actually work
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Every feature was designed around the goal of making daily report
              writing take less than 10 seconds per task.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.title}
                  className="group border-border/60 bg-card/80 shadow-soft backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-semibold">{f.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section
        className="px-4 py-20 sm:px-6"
        id="how-it-works"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <Badge className="mb-4" variant="outline">
              Simple by design
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              From zero to logged in 3 steps
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              No complicated setup. No bloated forms. Just fast, frictionless
              daily reporting.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* connector line */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
            />
            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col gap-4">
                <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-primary/20 bg-card font-mono text-2xl font-bold text-primary shadow-soft">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-secondary/40 px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            { value: "10s", label: "To add a task" },
            { value: "3", label: "Export formats" },
            { value: "11", label: "Phases built" },
            { value: "100%", label: "TypeScript" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-3xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech stack ───────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6" id="tech-stack">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-4" variant="default">
            Tech stack
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Built on solid foundations
          </h2>
          <p className="mb-10 text-muted-foreground">
            Modern, production-proven tools chosen for maintainability and
            developer experience.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-secondary"
              >
                <Zap className="h-3 w-3 text-primary" />
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-20 pt-4 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-[1px] shadow-soft">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-primary to-[hsl(190,68%,22%)] px-8 py-14 text-center text-primary-foreground sm:px-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:28px_28px] opacity-20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to take back your day?
              </h2>
              <p className="mb-8 text-primary-foreground/80">
                Create your account and log your first task in under a minute.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-white px-8 text-base font-semibold text-primary hover:bg-white/90"
                >
                  <Link href="/register">
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-12 border border-white/30 px-8 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">
                    <Hash className="mr-2 h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FileSearch className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold">DailyReport</span>
            </div>
            <Separator
              orientation="vertical"
              className="hidden h-4 sm:block"
            />
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                href="/login"
                className="transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="transition-colors hover:text-foreground"
              >
                Register
              </Link>
              <Link
                href="/admin"
                className="transition-colors hover:text-foreground"
              >
                Admin
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} DailyReport. Built with Next.js.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
