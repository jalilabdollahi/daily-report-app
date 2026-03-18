"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";

import type { ActiveAnnouncement } from "@/types/dashboard";

export function AnnouncementBanner({
  announcements,
}: {
  announcements: ActiveAnnouncement[];
}) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.includes(announcement.id),
  );

  if (!visibleAnnouncements.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => (
        <div
          className="flex items-start justify-between gap-4 rounded-3xl border border-primary/15 bg-primary/5 px-5 py-4"
          key={announcement.id}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {announcement.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {announcement.message}
              </p>
            </div>
          </div>
          <button
            className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            onClick={() =>
              setDismissedIds((current) => [...current, announcement.id])
            }
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
