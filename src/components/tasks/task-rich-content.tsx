import DOMPurify from "isomorphic-dompurify";

import { cn } from "@/lib/utils";

export function TaskRichContent({
  className,
  value,
}: {
  value: string;
  className?: string;
}) {
  const sanitizedHtml = DOMPurify.sanitize(value || "<p>No daily report notes added yet.</p>");

  return (
    <div
      className={cn("tiptap-content text-sm leading-6 text-muted-foreground", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
