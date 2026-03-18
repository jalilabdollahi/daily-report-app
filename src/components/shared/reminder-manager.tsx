"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatReminderTime, getReminderStorageKey, isWithinReminderWindow } from "@/lib/reminders";
import type { UserProfile } from "@/types/user";

async function fetchProfile(signal?: AbortSignal) {
  const response = await fetch("/api/user/profile", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load reminder settings.");
  }

  const payload = (await response.json()) as { data: UserProfile };
  return payload.data;
}

export function ReminderManager() {
  const { status } = useSession();
  const [promptDismissed, setPromptDismissed] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission,
  );
  const profileQuery = useQuery({
    queryKey: ["user-profile", "reminders"],
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  const profile = profileQuery.data;
  const shouldPrompt = useMemo(
    () =>
      status === "authenticated" &&
      profile?.reminderEnabled &&
      permission === "default" &&
      !promptDismissed,
    [permission, profile?.reminderEnabled, promptDismissed, status],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem("daily-report-reminder-prompt-dismissed");
    setPromptDismissed(dismissed === "true");
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !profile?.reminderEnabled ||
      permission !== "granted"
    ) {
      return;
    }

    const maybeNotify = () => {
      if (
        !isWithinReminderWindow({
          reminderTime: profile.reminderTime,
          now: new Date(),
          windowMinutes: 1,
        })
      ) {
        return;
      }

      const storageKey = getReminderStorageKey();
      if (window.localStorage.getItem(storageKey)) {
        return;
      }

      const notification = new Notification("Daily Report Reminder", {
        body: "Don't forget to log your tasks for today!",
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = "/dashboard/tasks/new";
      };

      window.localStorage.setItem(storageKey, "true");
    };

    maybeNotify();
    const intervalId = window.setInterval(maybeNotify, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [permission, profile?.reminderEnabled, profile?.reminderTime]);

  if (!shouldPrompt || !profile) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(92vw,360px)] rounded-[1.75rem] border border-primary/20 bg-background/95 p-5 shadow-soft backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="font-medium">Enable browser reminders?</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Your daily reminder is set for {formatReminderTime(profile.reminderTime)}.
            Allow notifications if you want a browser nudge while the app is open.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                const nextPermission = await Notification.requestPermission();
                setPermission(nextPermission);
              }}
              size="sm"
              type="button"
            >
              <Bell className="mr-2 h-4 w-4" />
              Allow reminders
            </Button>
            <Button
              onClick={() => {
                window.localStorage.setItem(
                  "daily-report-reminder-prompt-dismissed",
                  "true",
                );
                setPromptDismissed(true);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Dismiss
            </Button>
            <Button asChild size="sm" type="button" variant="outline">
              <Link href="/dashboard/settings">Reminder settings</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
