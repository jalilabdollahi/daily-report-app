import { Fragment } from "react";

export function HighlightedText({
  className,
  query,
  text,
}: {
  text: string;
  query?: string;
  className?: string;
}) {
  if (!query?.trim()) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escapedQuery})`, "ig");
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {part.toLowerCase() === query.toLowerCase() ? (
            <mark className="rounded bg-accent/35 px-1 py-0.5 text-foreground">
              {part}
            </mark>
          ) : (
            part
          )}
        </Fragment>
      ))}
    </span>
  );
}
