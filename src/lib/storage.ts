import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const STORAGE_ROUTE_PREFIX = "/api/files/";

type UploadProvider = "local" | "s3";

let s3Client: S3Client | null = null;

function normalizePathPart(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function getAwsRegion() {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!region) {
    throw new Error(
      "Set AWS_REGION when UPLOAD_PROVIDER is configured to use S3.",
    );
  }

  return region;
}

function getS3BucketName() {
  const bucketName = process.env.S3_UPLOAD_BUCKET;

  if (!bucketName) {
    throw new Error(
      "Set S3_UPLOAD_BUCKET when UPLOAD_PROVIDER is configured to use S3.",
    );
  }

  return bucketName;
}

function getS3KeyPrefix() {
  return normalizePathPart(process.env.S3_UPLOAD_PREFIX ?? "");
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getAwsRegion(),
    });
  }

  return s3Client;
}

function buildS3ObjectKey(storageKey: string) {
  const prefix = getS3KeyPrefix();
  return prefix ? `${prefix}/${storageKey}` : storageKey;
}

export function getUploadProvider(): UploadProvider {
  return process.env.UPLOAD_PROVIDER === "s3" ? "s3" : "local";
}

export function isS3UploadProvider() {
  return getUploadProvider() === "s3";
}

export function buildStorageFileUrl(storageKey: string) {
  const encodedKey = storageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${STORAGE_ROUTE_PREFIX}${encodedKey}`;
}

export function parseStorageKeyFromUrl(fileUrl: string | null | undefined) {
  if (!fileUrl?.startsWith(STORAGE_ROUTE_PREFIX)) {
    return null;
  }

  const encodedPath = fileUrl.slice(STORAGE_ROUTE_PREFIX.length);

  if (!encodedPath) {
    return null;
  }

  return encodedPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function validateStorageKey(storageKey: string) {
  const segments = storageKey.split("/");

  if (
    !segments.length ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid storage key.");
  }

  return storageKey;
}

export async function uploadFileToS3({
  body,
  cacheControl,
  contentType,
  storageKey,
}: {
  storageKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}) {
  const validatedStorageKey = validateStorageKey(storageKey);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3BucketName(),
      Key: buildS3ObjectKey(validatedStorageKey),
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      ServerSideEncryption: "AES256",
    }),
  );

  return buildStorageFileUrl(validatedStorageKey);
}

export async function getFileFromS3(storageKey: string) {
  const validatedStorageKey = validateStorageKey(storageKey);
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getS3BucketName(),
      Key: buildS3ObjectKey(validatedStorageKey),
    }),
  );

  if (!response.Body) {
    throw new Error("File not found.");
  }

  const bytes = await response.Body.transformToByteArray();

  return {
    body: Buffer.from(bytes),
    cacheControl: response.CacheControl ?? "private, max-age=300",
    contentDisposition: response.ContentDisposition ?? undefined,
    contentLength: response.ContentLength ?? bytes.length,
    contentType: response.ContentType ?? "application/octet-stream",
    etag: response.ETag ?? undefined,
    lastModified: response.LastModified?.toUTCString() ?? undefined,
  };
}

export async function deleteFileFromS3(storageKey: string) {
  const validatedStorageKey = validateStorageKey(storageKey);

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getS3BucketName(),
      Key: buildS3ObjectKey(validatedStorageKey),
    }),
  );
}
