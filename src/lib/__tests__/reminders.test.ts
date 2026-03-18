import {
  buildDashboardReminderCopy,
  formatReminderTime,
  getReminderStorageKey,
  isPastReminderTime,
  isWithinReminderWindow,
} from "@/lib/reminders";

describe("reminder helpers", () => {
  it("formats reminder time for display", () => {
    expect(formatReminderTime("17:30")).toMatch(/5:30/);
  });

  it("detects when a reminder time has passed", () => {
    expect(
      isPastReminderTime("09:00", new Date("2026-03-16T10:00:00")),
    ).toBe(true);
  });

  it("detects reminder windows", () => {
    expect(
      isWithinReminderWindow({
        reminderTime: "17:00",
        now: new Date("2026-03-16T17:10:00"),
        windowMinutes: 15,
      }),
    ).toBe(true);
  });

  it("builds stronger copy when the reminder is overdue", () => {
    const copy = buildDashboardReminderCopy({
      reminderEnabled: true,
      reminderTime: "09:00",
      now: new Date("2026-03-16T18:00:00"),
    });

    expect(copy.overdue).toBe(true);
    expect(copy.title).toContain("End of day");
  });

  it("builds a date-specific storage key", () => {
    expect(getReminderStorageKey(new Date("2026-03-16T12:00:00"))).toBe(
      "daily-report-reminder:2026-03-16",
    );
  });
});
