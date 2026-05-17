const { z } = require('zod');

const presignedUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.enum(['PDF', 'PPT', 'NOTES']),
  classId:  z.string().uuid(),
  contentType: z.string().optional(),
});

const saveMetadataSchema = z.object({
  title:    z.string().min(1).max(255),
  s3Key:    z.string().min(1),
  fileType: z.enum(['PDF', 'PPT', 'NOTES']),
  classId:  z.string().uuid(),
});

module.exports = { presignedUrlSchema, saveMetadataSchema };
