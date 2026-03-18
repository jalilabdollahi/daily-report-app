"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OPEN_SHORTCUTS_EVENT = "daily-report:open-shortcuts";

const shortcuts = [
  {
    keys: "Ctrl/Cmd + N",
    label: "Open the new task form",
  },
  {
    keys: "Ctrl/Cmd + K",
    label: "Focus the global task search",
  },
  {
    keys: "?",
    label: "Open keyboard shortcuts help",
  },
  {
    keys: "Escape",
    label: "Close the active modal, menu, or search surface",
  },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function openKeyboardShortcutsDialog() {
  window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
}

export function KeyboardShortcuts() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenDialog = () => setIsOpen(true);

    const handleKeydown = (event: KeyboardEvent) => {
      if (!isTypingTarget(event.target)) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
          event.preventDefault();
          router.push("/dashboard/tasks/new");
          return;
        }

        if (event.key === "?") {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener(OPEN_SHORTCUTS_EVENT, handleOpenDialog);
    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, handleOpenDialog);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [router]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Keep the reporting workflow fast without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border/70 bg-secondary/25 px-4 py-3"
              key={shortcut.keys}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Keyboard className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground">{shortcut.label}</p>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                {shortcut.keys}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setIsOpen(false)} type="button" variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
