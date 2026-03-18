type CsvScalar = string | number | boolean | null | undefined;

function escapeCell(value: CsvScalar) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv({
  headers,
  rows,
  includeBom = true,
}: {
  headers: string[];
  rows: CsvScalar[][];
  includeBom?: boolean;
}) {
  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `${includeBom ? "\uFEFF" : ""}${csv.join("\n")}`;
}

export function createAttachmentFilename({
  prefix,
  extension,
  suffix,
}: {
  prefix: string;
  extension: string;
  suffix?: string;
}) {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${suffix ? `${suffix}-` : ""}${timestamp}.${extension}`;
}
