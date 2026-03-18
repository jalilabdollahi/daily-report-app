import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ReminderManager } from "@/components/shared/reminder-manager";

vi.stubGlobal("Notification", {
  permission: "default",
  requestPermission: vi.fn(async () => "granted"),
});

describe("ReminderManager", () => {
  it("shows a permission prompt when reminders are enabled", async () => {
    const queryClient = new QueryClient();
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(window, "localStorage", {
      value: storage,
      writable: true,
    });

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "user-1",
            name: "Test User",
            email: "test@example.com",
            avatarUrl: null,
            theme: "SYSTEM",
            reminderEnabled: true,
            reminderTime: "17:00",
            role: "USER",
            createdAt: new Date().toISOString(),
          },
        }),
      ),
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ReminderManager />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Enable browser reminders?"),
    ).toBeInTheDocument();
  });
});
