const { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { aws } = require('../config/env');

const s3 = new S3Client({
  region:      aws.region,
  credentials: {
    accessKeyId:     aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
  },
  // SDK v3.600+ adds CRC32 checksum params to presigned PUT URLs by default.
  // AAAAAA== placeholder never matches real file content → SignatureDoesNotMatch.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function createPresignedUploadUrl(s3Key, contentType) {
  const command = new PutObjectCommand({
    Bucket:      aws.bucket,
    Key:         s3Key,
    ContentType: contentType || 'application/octet-stream',
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

async function createPresignedDownloadUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: aws.bucket,
    Key:    s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

// Handles both versioned and non-versioned buckets.
// On a versioned bucket, DeleteObjectCommand only adds a delete marker — we must
// explicitly delete every version and delete marker to fully remove the object.
async function deleteObject(s3Key) {
  const { Versions = [], DeleteMarkers = [] } = await s3.send(
    new ListObjectVersionsCommand({ Bucket: aws.bucket, Prefix: s3Key })
  );

  const toDelete = [...Versions, ...DeleteMarkers]
    .filter((v) => v.Key === s3Key)
    .map((v) => ({ Key: v.Key, VersionId: v.VersionId }));

  if (toDelete.length === 0) {
    // Non-versioned bucket or object already gone — single delete is enough
    return s3.send(new DeleteObjectCommand({ Bucket: aws.bucket, Key: s3Key }));
  }

  await Promise.all(
    toDelete.map((obj) =>
      s3.send(new DeleteObjectCommand({ Bucket: aws.bucket, Key: obj.Key, VersionId: obj.VersionId }))
    )
  );
}

function buildPublicUrl(s3Key) {
  return `https://${aws.bucket}.s3.${aws.region}.amazonaws.com/${s3Key}`;
}

module.exports = { createPresignedUploadUrl, createPresignedDownloadUrl, deleteObject, buildPublicUrl };
