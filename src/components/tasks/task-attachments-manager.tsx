"use client";

import Image from "next/image";
import {
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskDetail } from "@/types/task";

type AttachmentItem = TaskDetail["attachments"][number];

async function uploadAttachments(taskId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`/api/tasks/${taskId}/attachments`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | { data: AttachmentItem[] }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to upload attachments.",
    );
  }

  if (!("data" in payload)) {
    throw new Error("Unable to upload attachments.");
  }

  return payload.data;
}

async function deleteAttachment(taskId: string, attachmentId: string) {
  const response = await fetch(
    `/api/tasks/${taskId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { success: true }
    | { error: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "error" in payload
        ? payload.error
        : "Unable to remove attachment.",
    );
  }
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(fileType: string) {
  return fileType.startsWith("image/");
}

export function TaskAttachmentsManager({
  attachments,
  pendingFiles,
  taskId,
  onPendingFilesChange,
}: {
  taskId?: string;
  attachments: AttachmentItem[];
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [existingAttachments, setExistingAttachments] =
    useState<AttachmentItem[]>(attachments);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setExistingAttachments(attachments);
  }, [attachments]);

  const previewUrls = useMemo(
    () =>
      pendingFiles.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      })),
    [pendingFiles],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [previewUrls]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!taskId || !pendingFiles.length) {
        return [];
      }

      return uploadAttachments(taskId, pendingFiles);
    },
    onSuccess: async (data) => {
      if (!taskId) {
        return;
      }

      setExistingAttachments((current) => [...data, ...current]);
      onPendingFilesChange([]);
      toast.success("Attachments uploaded.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to upload attachments.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!taskId) {
        return;
      }

      await deleteAttachment(taskId, attachmentId);
      return attachmentId;
    },
    onSuccess: async (attachmentId) => {
      if (!taskId || !attachmentId) {
        return;
      }

      setExistingAttachments((current) =>
        current.filter((attachment) => attachment.id !== attachmentId),
      );
      toast.success("Attachment removed.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove attachment.",
      );
    },
  });

  const addFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    onPendingFilesChange([...pendingFiles, ...nextFiles].slice(0, 5));
  };

  return (
    <div className="space-y-4">
      <div
        className={`rounded-[1.5rem] border border-dashed px-5 py-6 transition ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-secondary/30"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          className="hidden"
          multiple
          onChange={(event) => addFiles(event.target.files ?? [])}
          ref={inputRef}
          type="file"
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="font-medium">Attachments</p>
            <p className="text-sm text-muted-foreground">
              Drag files here or browse. Supported: images, pdf, doc, docx, txt,
              csv, zip. Up to 5 files, 10MB each.
            </p>
            {!taskId ? (
              <p className="text-sm text-primary">
                Files will upload after the task is created.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Browse files
            </Button>
            {taskId ? (
              <Button
                disabled={!pendingFiles.length || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
                type="button"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload selected
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {pendingFiles.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {previewUrls.map(({ file, previewUrl }) => (
            <Card
              className="border-white/70 bg-white/80 shadow-soft"
              key={`${file.name}-${file.size}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {previewUrl ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border/70">
                    <Image
                      alt={file.name}
                      className="object-cover"
                      fill
                      src={previewUrl}
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-secondary/50">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {file.type || "file"}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    onPendingFilesChange(
                      pendingFiles.filter((item) => item !== file),
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {existingAttachments.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {existingAttachments.map((attachment) => (
            <Card
              className="border-white/70 bg-white/80 shadow-soft"
              key={attachment.id}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {isImageAttachment(attachment.fileType) ? (
                  <a
                    className="relative block h-16 w-16 overflow-hidden rounded-2xl border border-border/70"
                    href={attachment.fileUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Image
                      alt={attachment.fileName}
                      className="object-cover"
                      fill
                      src={attachment.fileUrl}
                      unoptimized
                    />
                  </a>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-secondary/50">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(attachment.fileSize)} ·{" "}
                    {attachment.fileType}
                  </p>
                </div>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(attachment.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
