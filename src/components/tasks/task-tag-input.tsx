"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskTag } from "@/types/task";

export function TaskTagInput({
  availableTags,
  onChange,
  value,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  availableTags: TaskTag[];
}) {
  const [tagInput, setTagInput] = useState("");
  const filteredTags = useMemo(
    () =>
      availableTags.filter(
        (tag) =>
          !value.includes(tag.name) &&
          (tagInput
            ? tag.name.toLowerCase().includes(tagInput.toLowerCase())
            : true),
      ),
    [availableTags, tagInput, value],
  );

  const addTag = (tagName: string) => {
    const trimmedName = tagName.trim();

    if (!trimmedName || value.includes(trimmedName)) {
      setTagInput("");
      return;
    }

    onChange([...value, trimmedName]);
    setTagInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge
            className="inline-flex items-center gap-2 border-primary/20 bg-primary/10"
            key={tag}
            variant="outline"
          >
            {tag}
            <button
              onClick={() => onChange(value.filter((item) => item !== tag))}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(tagInput);
            }
          }}
          placeholder="Add a tag and press Enter"
          value={tagInput}
        />
        <Button
          onClick={() => addTag(tagInput)}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {filteredTags.length ? (
        <div className="flex flex-wrap gap-2">
          {filteredTags.slice(0, 8).map((tag) => (
            <button
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              key={tag.id}
              onClick={() => addTag(tag.name)}
              type="button"
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
