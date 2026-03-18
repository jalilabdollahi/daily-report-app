import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import {
  deleteFileFromS3,
  isS3UploadProvider,
  parseStorageKeyFromUrl,
  uploadFileToS3,
} from "@/lib/storage";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const AVATAR_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "avatars",
);
const ATTACHMENT_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "attachments",
);
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENT_FILES_PER_REQUEST = 5;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF_SIGNATURE = [0x47, 0x49, 0x46, 0x38];
const WEBP_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const DOC_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

function hasSignature(buffer: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => buffer[index] === byte);
}

function looksLikeText(buffer: Uint8Array) {
  return buffer.every(
    (byte) =>
      byte === 9 ||
      byte === 10 ||
      byte === 13 ||
      (byte >= 32 && byte <= 126),
  );
}

async function validateFileContents(file: File, type: string) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (type === "image/png" && !hasSignature(bytes, PNG_SIGNATURE)) {
    throw new Error(`${file.name} does not appear to be a valid PNG file.`);
  }

  if (
    (type === "image/jpeg" || type === "image/jpg") &&
    !hasSignature(bytes, JPEG_SIGNATURE)
  ) {
    throw new Error(`${file.name} does not appear to be a valid JPEG file.`);
  }

  if (type === "image/gif" && !hasSignature(bytes, GIF_SIGNATURE)) {
    throw new Error(`${file.name} does not appear to be a valid GIF file.`);
  }

  if (
    type === "image/webp" &&
    (!hasSignature(bytes, WEBP_SIGNATURE) ||
      String.fromCharCode(...Array.from(bytes.slice(8, 12))) !== "WEBP")
  ) {
    throw new Error(`${file.name} does not appear to be a valid WebP file.`);
  }

  if (type === "application/pdf" && !hasSignature(bytes, PDF_SIGNATURE)) {
    throw new Error(`${file.name} does not appear to be a valid PDF file.`);
  }

  if (
    [
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(type) &&
    !hasSignature(bytes, ZIP_SIGNATURE)
  ) {
    throw new Error(`${file.name} does not appear to be a valid ZIP-based file.`);
  }

  if (type === "application/msword" && !hasSignature(bytes, DOC_SIGNATURE)) {
    throw new Error(`${file.name} does not appear to be a valid Word document.`);
  }

  if ((type === "text/plain" || type === "text/csv") && !looksLikeText(bytes)) {
    throw new Error(`${file.name} does not appear to be a valid text file.`);
  }
}

export async function ensureAvatarUploadDirectory() {
  await mkdir(AVATAR_UPLOAD_DIRECTORY, { recursive: true });
}

export async function ensureAttachmentUploadDirectory(taskId: string) {
  const directory = path.join(ATTACHMENT_UPLOAD_DIRECTORY, taskId);
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Avatar must be a jpg, jpeg, png, gif, or webp image.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Avatar must be 2MB or smaller.");
  }

  await validateFileContents(file, file.type);
}

export async function validateAttachmentFiles(
  files: File[],
  options?: { maxFileSizeBytes?: number },
) {
  const maxFileSizeBytes = options?.maxFileSizeBytes ?? MAX_ATTACHMENT_SIZE;

  if (!files.length) {
    throw new Error("Choose at least one attachment to upload.");
  }

  if (files.length > MAX_ATTACHMENT_FILES_PER_REQUEST) {
    throw new Error("You can upload up to 5 files at a time.");
  }

  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      throw new Error(
        `${file.name} is not a supported file type. Upload jpg, png, gif, webp, pdf, doc, docx, txt, csv, or zip files.`,
      );
    }

    if (file.size > maxFileSizeBytes) {
      throw new Error(
        `${file.name} must be ${Math.round(maxFileSizeBytes / (1024 * 1024))}MB or smaller.`,
      );
    }

    await validateFileContents(file, file.type);
  }
}

export async function saveAvatarFile(file: File) {
  await validateAvatarFile(file);

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();

  if (isS3UploadProvider()) {
    return uploadFileToS3({
      storageKey: `avatars/${fileName}`,
      body: Buffer.from(bytes),
      contentType: file.type,
      cacheControl: "private, max-age=31536000, immutable",
    });
  }

  await ensureAvatarUploadDirectory();
  const filePath = path.join(AVATAR_UPLOAD_DIRECTORY, fileName);
  await writeFile(filePath, Buffer.from(bytes));

  return `/uploads/avatars/${fileName}`;
}

export async function saveAttachmentFiles(
  taskId: string,
  files: File[],
  options?: { maxFileSizeBytes?: number },
) {
  await validateAttachmentFiles(files, options);

  if (isS3UploadProvider()) {
    return Promise.all(
      files.map(async (file) => {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const fileName = `${randomUUID()}.${extension}`;
        const storageKey = `attachments/${taskId}/${fileName}`;
        const bytes = await file.arrayBuffer();
        const fileUrl = await uploadFileToS3({
          storageKey,
          body: Buffer.from(bytes),
          contentType: file.type,
          cacheControl: "private, max-age=31536000, immutable",
        });

        return {
          fileName: file.name,
          filePath: storageKey,
          fileType: file.type,
          fileSize: file.size,
          fileUrl,
        };
      }),
    );
  }

  const directory = await ensureAttachmentUploadDirectory(taskId);

  return Promise.all(
    files.map(async (file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const fileName = `${randomUUID()}.${extension}`;
      const filePath = path.join(directory, fileName);
      const bytes = await file.arrayBuffer();

      await writeFile(filePath, Buffer.from(bytes));

      return {
        fileName: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: `/uploads/attachments/${taskId}/${fileName}`,
      };
    }),
  );
}

export async function deleteAvatarFile(avatarUrl: string | null | undefined) {
  const storageKey = parseStorageKeyFromUrl(avatarUrl);

  if (storageKey) {
    await deleteFileFromS3(storageKey);
    return;
  }

  if (!avatarUrl?.startsWith("/uploads/avatars/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", avatarUrl);

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteAttachmentFile(fileUrl: string | null | undefined) {
  const storageKey = parseStorageKeyFromUrl(fileUrl);

  if (storageKey) {
    await deleteFileFromS3(storageKey);
    return;
  }

  if (!fileUrl?.startsWith("/uploads/attachments/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", fileUrl);

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
