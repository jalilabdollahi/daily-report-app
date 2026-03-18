"use client";

import Image from "next/image";
import { FileText, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskDetail } from "@/types/task";

type AttachmentItem = TaskDetail["attachments"][number];

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(fileType: string) {
  return fileType.startsWith("image/");
}

export function TaskAttachmentGallery({
  attachments,
}: {
  attachments: AttachmentItem[];
}) {
  const [selectedImage, setSelectedImage] = useState<AttachmentItem | null>(null);

  if (!attachments.length) {
    return (
      <Card className="border-dashed border-border/70 bg-white/70 shadow-soft">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No attachments on this task yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {attachments.map((attachment) => (
          <Card className="border-white/70 bg-white/80 shadow-soft" key={attachment.id}>
            <CardContent className="flex items-center gap-4 p-4">
              {isImageAttachment(attachment.fileType) ? (
                <button
                  className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border/70"
                  onClick={() => setSelectedImage(attachment)}
                  type="button"
                >
                  <Image
                    alt={attachment.fileName}
                    className="object-cover"
                    fill
                    src={attachment.fileUrl}
                    unoptimized
                  />
                </button>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/70 bg-secondary/50">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  className="block truncate font-medium text-primary hover:underline"
                  href={attachment.fileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {attachment.fileName}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} · {attachment.fileType}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-background shadow-soft">
            <Button
              className="absolute right-4 top-4 z-10"
              onClick={() => setSelectedImage(null)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="relative aspect-[16/10] w-full">
              <Image
                alt={selectedImage.fileName}
                className="object-contain"
                fill
                src={selectedImage.fileUrl}
                unoptimized
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
