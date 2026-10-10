/**
 * lib/s3.js
 * S3 client + presigned URL helpers.
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

export const BUCKET = process.env.UPLOADS_BUCKET ?? '';
const UPLOAD_EXPIRY = Number(process.env.PRESIGN_EXPIRY_SECONDS ?? 300);
const GET_EXPIRY = Number(process.env.PRESIGN_GET_EXPIRY_SECONDS ?? 3600);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Generate a presigned POST for direct browser-to-S3 upload.
 * @param {string} reportId
 * @param {string} contentType
 * @returns {{ uploadUrl, fields, objectKey, expiresIn }}
 */
export async function generatePresignedPost(reportId, contentType) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Content-Type not allowed: ${contentType}`);
  }

  const ext = contentType.split('/')[1];
  const objectKey = `uploads/${reportId}/photo.${ext}`;

  const { url: uploadUrl, fields } = await createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: objectKey,
    Conditions: [
      { 'Content-Type': contentType },
      ['content-length-range', 1, MAX_SIZE_BYTES],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: UPLOAD_EXPIRY,
  });

  return { uploadUrl, fields, objectKey, expiresIn: UPLOAD_EXPIRY };
}

/**
 * Generate a presigned GET URL for viewing a stored object.
 * @param {string} objectKey  e.g. "uploads/rpt_xxx/photo.jpg"
 * @returns {string} signed URL
 */
export async function generatePresignedGet(objectKey) {
  if (!objectKey) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }),
    { expiresIn: GET_EXPIRY }
  );
}
