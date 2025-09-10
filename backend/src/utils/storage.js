import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const {
  DO_SPACES_KEY,
  DO_SPACES_SECRET,
  DO_SPACES_ENDPOINT,
  DO_SPACES_BUCKET,
  DO_SPACES_REGION,
} = process.env;

if (!DO_SPACES_KEY || !DO_SPACES_SECRET || !DO_SPACES_ENDPOINT || !DO_SPACES_BUCKET || !DO_SPACES_REGION) {
  // eslint-disable-next-line no-console
  console.warn('[storage] Missing one or more DO_SPACES_* env vars; uploads will fail until configured');
}

// Configure S3-compatible client for DigitalOcean Spaces (AWS SDK v3)
const s3 = new S3Client({
  region: DO_SPACES_REGION,
  endpoint: `https://${DO_SPACES_ENDPOINT}`,
  credentials: {
    accessKeyId: DO_SPACES_KEY || '',
    secretAccessKey: DO_SPACES_SECRET || '',
  },
  forcePathStyle: false,
});

export async function uploadBuffer({ key, buffer, contentType, acl = 'public-read' }) {
  if (!DO_SPACES_BUCKET) throw new Error('Missing DO_SPACES_BUCKET');
  const command = new PutObjectCommand({
    Bucket: DO_SPACES_BUCKET,
    Key: key,
    Body: buffer,
    ACL: acl,
    ContentType: contentType || 'application/octet-stream',
  });
  await s3.send(command);
  return {
    key,
    url: publicUrl(key),
    bucket: DO_SPACES_BUCKET,
  };
}

export function publicUrl(key) {
  if (!DO_SPACES_BUCKET || !DO_SPACES_ENDPOINT) return null;
  return `https://${DO_SPACES_BUCKET}.${DO_SPACES_ENDPOINT}/${key}`;
}
