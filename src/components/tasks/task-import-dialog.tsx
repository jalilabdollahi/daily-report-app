"use client";

import Papa from "papaparse";
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MappingField =
  | "date"
  | "ticketNumber"
  | "ticketTitle"
  | "ticketDescription"
  | "storyPoint"
  | "status"
  | "tags"
  | "dailyReport";

type PreviewRow = Record<MappingField, string>;

type ImportResponse = {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; field: string; message: string }>;
};

const MAPPING_FIELDS: Array<{ key: MappingField; label: string; required?: boolean }> = [
  { key: "date", label: "Date", required: true },
  { key: "ticketNumber", label: "Ticket Number", required: true },
  { key: "ticketTitle", label: "Ticket Title", required: true },
  { key: "ticketDescription", label: "Ticket Description" },
  { key: "storyPoint", label: "Story Point" },
  { key: "status", label: "Status" },
  { key: "tags", label: "Tags" },
  { key: "dailyReport", label: "Daily Report" },
];

const CSV_ALIASES: Record<MappingField, string[]> = {
  date: ["date", "task date", "logged date"],
  ticketNumber: ["ticket number", "ticket_number", "ticket", "issue key"],
  ticketTitle: ["ticket title", "ticket_title", "title", "summary"],
  ticketDescription: ["ticket description", "ticket_description", "description"],
  storyPoint: ["story point", "story points", "story_point", "sp"],
  status: ["status"],
  tags: ["tags", "labels"],
  dailyReport: ["daily report", "daily_report", "report", "notes"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function detectMapping(headers: string[]) {
  return MAPPING_FIELDS.reduce<Record<MappingField, string>>((acc, field) => {
    const detected =
      headers.find((header) =>
        CSV_ALIASES[field.key].some((alias) => normalizeHeader(alias) === normalizeHeader(header)),
      ) ?? "";
    acc[field.key] = detected;
    return acc;
  }, {} as Record<MappingField, string>);
}

async function importTasks(file: File, mapping: Record<MappingField, string>) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mapping", JSON.stringify(mapping));

  const response = await fetch("/api/tasks/import", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: ImportResponse; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to import tasks.");
  }

  return payload?.data ?? { imported: 0, skipped: 0, errors: [] };
}

export function TaskImportDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileFormat, setFileFormat] = useState<"csv" | "json" | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<MappingField, string>>(
    {} as Record<MappingField, string>,
  );
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const importMutation = useMutation({
    mutationFn: ({ activeFile, activeMapping }: { activeFile: File; activeMapping: Record<MappingField, string> }) =>
      importTasks(activeFile, activeMapping),
    onSuccess: async (response) => {
      setResult(response);
      toast.success(
        `Imported ${response.imported} task${response.imported === 1 ? "" : "s"}.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["duplicate-previous-preview"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to import tasks.");
    },
  });

  const hasRequiredMappings = useMemo(
    () =>
      ["date", "ticketNumber", "ticketTitle"].every(
        (field) => mapping[field as MappingField]?.trim(),
      ),
    [mapping],
  );

  const previewRows = useMemo(
    () =>
      rawRows.slice(0, 5).map((row) => ({
        date: String(row[mapping.date] ?? ""),
        ticketNumber: String(row[mapping.ticketNumber] ?? ""),
        ticketTitle: String(row[mapping.ticketTitle] ?? ""),
        ticketDescription: String(row[mapping.ticketDescription] ?? ""),
        storyPoint: String(row[mapping.storyPoint] ?? ""),
        status: String(row[mapping.status] ?? ""),
        tags: String(row[mapping.tags] ?? ""),
        dailyReport: String(row[mapping.dailyReport] ?? ""),
      })),
    [mapping, rawRows],
  );

  const resetState = () => {
    setFile(null);
    setFileFormat(null);
    setDetectedHeaders([]);
    setMapping({} as Record<MappingField, string>);
    setRawRows([]);
    setResult(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const parseSelectedFile = async (selectedFile: File) => {
    const format = selectedFile.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    const content = await selectedFile.text();

    if (format === "json") {
      const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
      const rows = Array.isArray(parsed) ? parsed : [];
      setFile(selectedFile);
      setFileFormat(format);
      setDetectedHeaders(Object.keys(rows[0] ?? {}));
      setMapping(
        MAPPING_FIELDS.reduce<Record<MappingField, string>>((acc, field) => {
          acc[field.key] = field.key;
          return acc;
        }, {} as Record<MappingField, string>),
      );
      setRawRows(
        rows.map((row) => ({
          ...row,
          tags: Array.isArray(row.tags) ? row.tags.join(", ") : String(row.tags ?? ""),
        })),
      );
      setResult(null);
      return;
    }

    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length) {
      throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV file.");
    }

    const headers = parsed.meta.fields ?? [];
    const nextMapping = detectMapping(headers);
    setFile(selectedFile);
    setFileFormat(format);
    setDetectedHeaders(headers);
    setMapping(nextMapping);
    setRawRows(parsed.data);
    setResult(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      await parseSelectedFile(selectedFile);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read that file.");
    }
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      return;
    }

    try {
      await parseSelectedFile(selectedFile);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read that file.");
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          resetState();
        }
      }}
      open={isOpen}
    >
      <DialogContent className="w-[min(96vw,900px)]">
        <DialogHeader>
          <DialogTitle>Import tasks from CSV or JSON</DialogTitle>
          <DialogDescription>
            Preview the file first, confirm the columns, then import in one batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4">
            <div>
              <p className="font-medium">Need a clean starting point?</p>
              <p className="text-sm text-muted-foreground">
                Download the sample CSV template and fill it with your task history.
              </p>
            </div>
            <Button asChild type="button" variant="outline">
              <a download href="/api/tasks/import/template">
                <Download className="mr-2 h-4 w-4" />
                Download template
              </a>
            </Button>
          </section>

          <button
            className="flex w-full flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-border/70 bg-secondary/20 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-primary/5"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            type="button"
          >
            <UploadCloud className="h-10 w-10 text-primary" />
            <div className="space-y-1">
              <p className="font-medium">
                {file ? file.name : "Drop a .csv or .json file here"}
              </p>
              <p className="text-sm text-muted-foreground">
                Or click to browse from your computer.
              </p>
            </div>
          </button>
          <input
            accept=".csv,.json,application/json,text/csv"
            className="hidden"
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />

          {file ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{fileFormat?.toUpperCase()}</Badge>
                <Badge variant="outline">
                  {previewRows.length} preview row{previewRows.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {fileFormat === "csv" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {MAPPING_FIELDS.map((field) => (
                    <label className="space-y-2" key={field.key}>
                      <span className="text-sm font-medium">
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        className="h-11 w-full rounded-2xl border border-input bg-background/80 px-4 text-sm"
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        value={mapping[field.key] ?? ""}
                      >
                        <option value="">Not mapped</option>
                        {detectedHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-secondary/45 text-left">
                      <tr>
                        {MAPPING_FIELDS.map((field) => (
                          <th className="px-4 py-3 font-medium" key={field.key}>
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr className="border-t border-border/70" key={index}>
                          {MAPPING_FIELDS.map((field) => (
                            <td className="max-w-[180px] px-4 py-3 align-top text-muted-foreground" key={field.key}>
                              <span className="line-clamp-3">{row[field.key]}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {result ? (
            <section className="space-y-4 rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4">
              <p className="font-medium">
                {result.imported} task{result.imported === 1 ? "" : "s"} imported,{" "}
                {result.skipped} skipped.
              </p>
              {result.errors.length ? (
                <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-secondary/45 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Row</th>
                          <th className="px-4 py-3 font-medium">Field</th>
                          <th className="px-4 py-3 font-medium">Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((error, index) => (
                          <tr className="border-t border-border/70" key={`${error.row}-${index}`}>
                            <td className="px-4 py-3">{error.row}</td>
                            <td className="px-4 py-3">{error.field}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {error.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Every previewed row passed validation.
                </p>
              )}
            </section>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={resetState} type="button" variant="ghost">
            Reset
          </Button>
          <Button
            disabled={!file || !hasRequiredMappings || importMutation.isPending}
            onClick={() => {
              if (!file) {
                return;
              }

              importMutation.mutate({
                activeFile: file,
                activeMapping: mapping,
              });
            }}
            type="button"
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Import tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
