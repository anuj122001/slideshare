require('dotenv').config();

const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME;

async function existsInS3(s3Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function sync() {
  const docs = await prisma.document.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, s3Key: true },
  });

  console.log(`Checking ${docs.length} active document(s) against S3...\n`);

  let orphaned = 0;
  const deletedAt = new Date();

  for (const doc of docs) {
    const exists = await existsInS3(doc.s3Key);
    if (!exists) {
      await prisma.document.update({
        where: { id: doc.id },
        data:  { deletedAt },
      });
      console.log(`  [REMOVED] ${doc.title} (${doc.s3Key})`);
      orphaned++;
    }
  }

  console.log(`\nDone. ${orphaned} orphaned record(s) soft-deleted, ${docs.length - orphaned} record(s) OK.`);
}

sync()
  .catch((err) => { console.error('Sync failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
