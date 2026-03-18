export function getReminderMinutes(reminderTime: string) {
  const [hours, minutes] = reminderTime.split(":").map((value) => Number(value));
  return hours * 60 + minutes;
}

export function formatReminderTime(reminderTime: string) {
  const [hours, minutes] = reminderTime.split(":").map((value) => Number(value));
  const reference = new Date();
  reference.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(reference);
}

export function getReminderTone(now = new Date()) {
  const hour = now.getHours();

  if (hour < 12) {
    return "morning" as const;
  }

  if (hour < 18) {
    return "afternoon" as const;
  }

  return "evening" as const;
}

export function isPastReminderTime(reminderTime: string, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= getReminderMinutes(reminderTime);
}

export function isWithinReminderWindow({
  reminderTime,
  now = new Date(),
  windowMinutes = 15,
}: {
  reminderTime: string;
  now?: Date;
  windowMinutes?: number;
}) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const reminderMinutes = getReminderMinutes(reminderTime);
  return Math.abs(currentMinutes - reminderMinutes) <= windowMinutes;
}

export function getReminderStorageKey(date = new Date()) {
  return `daily-report-reminder:${date.toISOString().slice(0, 10)}`;
}

export function buildDashboardReminderCopy({
  reminderEnabled,
  reminderTime,
  now = new Date(),
}: {
  reminderEnabled: boolean;
  reminderTime: string;
  now?: Date;
}) {
  const tone = getReminderTone(now);
  const reminderLabel = formatReminderTime(reminderTime);
  const overdue = reminderEnabled && isPastReminderTime(reminderTime, now);

  if (tone === "morning") {
    return {
      title: overdue
        ? "Your reminder window is open."
        : "Good morning! Ready to log today's tasks?",
      description: reminderEnabled
        ? `Your daily reminder is set for ${reminderLabel}. A quick first entry now makes the rest of the day easier to summarize.`
        : "Start with one quick note and the rest of the day becomes much easier to review later.",
      overdue,
    };
  }

  if (tone === "afternoon") {
    return {
      title: overdue
        ? "Don't forget to log your afternoon tasks!"
        : "Keep the day moving while the details are still fresh.",
      description: reminderEnabled
        ? `You asked for a reminder at ${reminderLabel}, so this is a good checkpoint before the day gets busier.`
        : "Add a quick progress note now so the end-of-day wrap-up stays light.",
      overdue,
    };
  }

  return {
    title: overdue
      ? "End of day - have you logged all your tasks?"
      : "Give yourself an easy handoff into tomorrow.",
    description: reminderEnabled
      ? `Your ${reminderLabel} reminder is here. Capture the final updates while they are still easy to recall.`
      : "A short end-of-day report now saves you from reconstructing everything tomorrow.",
    overdue,
  };
}
