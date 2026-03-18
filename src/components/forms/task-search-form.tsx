"use client";

import { format } from "date-fns";
import { Clock3, CornerDownLeft, Search } from "lucide-react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { TasksResponse } from "@/types/task";

type SearchResult = {
  id: string;
  ticketNumber: string;
  ticketTitle: string;
  date: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
};

const RECENT_SEARCHES_KEY = "daily-report-app.recent-searches";

async function fetchSearchResults(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    search: query,
    limit: "8",
    sortBy: "date",
    sortOrder: "desc",
  });
  const response = await fetch(`/api/tasks?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to search tasks.");
  }

  return (await response.json()) as TasksResponse;
}

function saveRecentSearch(term: string) {
  if (!term.trim()) {
    return;
  }

  const existing =
    typeof window === "undefined"
      ? []
      : ((JSON.parse(
          window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
        ) as string[]) ?? []);

  const next = [
    term.trim(),
    ...existing.filter((item) => item !== term.trim()),
  ].slice(0, 5);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function TaskSearchForm() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
      ) as string[];
      setRecentSearches(Array.isArray(stored) ? stored : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }

      event.preventDefault();
      setIsOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchQuery = useQuery({
    queryKey: ["global-task-search", debouncedQuery],
    queryFn: ({ signal }) => fetchSearchResults(debouncedQuery.trim(), signal),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const flattenedResults = useMemo(() => {
    return (searchQuery.data?.data ?? []).flatMap((group) => group.tasks);
  }, [searchQuery.data]);

  const dropdownItems = useMemo(() => {
    if (debouncedQuery.trim()) {
      return flattenedResults.map((task) => ({
        type: "result" as const,
        key: task.id,
        label: task.ticketTitle,
        result: task as SearchResult,
      }));
    }

    return recentSearches.map((term) => ({
      type: "recent" as const,
      key: term,
      label: term,
    }));
  }, [debouncedQuery, flattenedResults, recentSearches]);

  useEffect(() => {
    setActiveIndex(dropdownItems.length ? 0 : -1);
  }, [dropdownItems]);

  const goToSearchResults = (term: string) => {
    const trimmedTerm = term.trim();

    if (!trimmedTerm) {
      return;
    }

    saveRecentSearch(trimmedTerm);
    setRecentSearches((current) =>
      [trimmedTerm, ...current.filter((item) => item !== trimmedTerm)].slice(
        0,
        5,
      ),
    );
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(`/dashboard/tasks?search=${encodeURIComponent(trimmedTerm)}`);
  };

  const goToTask = (taskId: string, term: string) => {
    saveRecentSearch(term);
    setRecentSearches((current) =>
      [term.trim(), ...current.filter((item) => item !== term.trim())].slice(
        0,
        5,
      ),
    );
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(`/dashboard/tasks/${taskId}/edit`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const activeItem = dropdownItems[activeIndex];

    if (activeItem?.type === "result") {
      goToTask(activeItem.result.id, query);
      return;
    }

    if (activeItem?.type === "recent") {
      setQuery(activeItem.label);
      goToSearchResults(activeItem.label);
      return;
    }

    goToSearchResults(query);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        dropdownItems.length ? (current + 1) % dropdownItems.length : -1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        dropdownItems.length
          ? (current - 1 + dropdownItems.length) % dropdownItems.length
          : -1,
      );
    }
  };

  const shouldShowDropdown =
    isOpen &&
    (query.trim().length > 0 ||
      recentSearches.length > 0 ||
      searchQuery.isLoading ||
      pathname.startsWith("/dashboard"));

  return (
    <div className="relative w-full max-w-xl" ref={containerRef}>
      <form className="relative w-full" onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tasks"
          className="pl-11 pr-24"
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks or jump to a ticket..."
          ref={inputRef}
          value={query}
        />
        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground xl:flex">
          <Badge variant="outline">Ctrl K</Badge>
        </div>
      </form>

      {shouldShowDropdown ? (
        <div className="bg-popover absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-[1.75rem] border border-border/70 shadow-soft">
          {debouncedQuery.trim() ? (
            <>
              {searchQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className="h-16 animate-pulse rounded-2xl bg-secondary/60"
                      key={index}
                    />
                  ))}
                </div>
              ) : flattenedResults.length ? (
                <div className="p-2">
                  {flattenedResults.map((result, index) => (
                    <button
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-secondary/70",
                        activeIndex === index ? "bg-secondary/80" : "",
                      )}
                      key={result.id}
                      onClick={() => goToTask(result.id, query)}
                      type="button"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-primary">
                            {result.ticketNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(result.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <p className="truncate text-sm font-medium">
                          {result.ticketTitle}
                        </p>
                      </div>
                      <TaskStatusBadge status={result.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  No results found. Press Enter to open the full search view.
                </div>
              )}
            </>
          ) : recentSearches.length ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Recent searches</span>
                <CornerDownLeft className="h-3.5 w-3.5" />
              </div>
              {recentSearches.map((term, index) => (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition hover:bg-secondary/70",
                    activeIndex === index ? "bg-secondary/80" : "",
                  )}
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    goToSearchResults(term);
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    {term}
                  </span>
                  <span className="text-xs text-muted-foreground">Open</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Search by ticket number, title, description, or report note. Press
              Enter to jump to the full results page.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
