const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { aws } = require('../config/env');

const s3 = new S3Client({
  region:      aws.region,
  credentials: {
    accessKeyId:     aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
  },
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

async function deleteObject(s3Key) {
  const command = new DeleteObjectCommand({
    Bucket: aws.bucket,
    Key:    s3Key,
  });
  return s3.send(command);
}

function buildPublicUrl(s3Key) {
  return `https://${aws.bucket}.s3.${aws.region}.amazonaws.com/${s3Key}`;
}

module.exports = { createPresignedUploadUrl, createPresignedDownloadUrl, deleteObject, buildPublicUrl };
