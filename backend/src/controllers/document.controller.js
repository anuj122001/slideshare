const prisma = require('../config/prisma');
const { createPresignedUploadUrl, createPresignedDownloadUrl, deleteObject, buildPublicUrl } = require('../services/s3.service');
const { generateS3Key } = require('../utils/keyGenerator');
const { presignedUrlSchema, saveMetadataSchema } = require('../validators/document.validator');
const ApiError = require('../utils/apiError');

async function getPresignedUrl(req, res, next) {
  try {
    const { filename, fileType, classId, contentType } = presignedUrlSchema.parse(req.body);

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return next(new ApiError(404, 'Class not found'));

    const s3Key = generateS3Key(cls.name, fileType, filename);
    const presignedUrl = await createPresignedUploadUrl(s3Key, contentType);

    res.json({ presignedUrl, s3Key });
  } catch (err) {
    next(err);
  }
}

async function saveMetadata(req, res, next) {
  try {
    const { title, s3Key, fileType, classId } = saveMetadataSchema.parse(req.body);

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) return next(new ApiError(404, 'Class not found'));

    const s3Url = buildPublicUrl(s3Key);

    const doc = await prisma.document.create({
      data: { title, s3Key, s3Url, fileType, classId, uploaderId: req.user.id },
      include: {
        class:    { select: { name: true } },
        uploader: { select: { name: true } },
      },
    });

    res.status(201).json({
      id:         doc.id,
      title:      doc.title,
      fileType:   doc.fileType,
      createdAt:  doc.createdAt,
      className:  doc.class.name,
      uploaderName: doc.uploader.name,
    });
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const { classId, fileType } = req.query;
    const where = { deletedAt: null };

    if (classId)  where.classId  = classId;
    if (fileType) where.fileType = fileType.toUpperCase();

    const docs = await prisma.document.findMany({
      where,
      include: {
        uploader: { select: { name: true } },
        class:    { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(docs.map((d) => ({
      id:          d.id,
      title:       d.title,
      fileType:    d.fileType,
      createdAt:   d.createdAt,
      className:   d.class.name,
      classId:     d.classId,
      uploaderName: d.uploader.name,
    })));
  } catch (err) {
    next(err);
  }
}

async function getDownloadUrl(req, res, next) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!doc) return next(new ApiError(404, 'Document not found'));

    const url = await createPresignedDownloadUrl(doc.s3Key);
    res.json({ downloadUrl: url });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!doc) return next(new ApiError(404, 'Document not found'));
    if (doc.uploaderId !== req.user.id) return next(new ApiError(403, 'Forbidden'));

    await deleteObject(doc.s3Key);
    await prisma.document.update({
      where: { id: doc.id },
      data:  { deletedAt: new Date() },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function myDocuments(req, res, next) {
  try {
    const { classId, fileType } = req.query;
    const where = { deletedAt: null, uploaderId: req.user.id };

    if (classId)  where.classId  = classId;
    if (fileType) where.fileType = fileType.toUpperCase();

    const docs = await prisma.document.findMany({
      where,
      include: {
        class: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(docs.map((d) => ({
      id:        d.id,
      title:     d.title,
      fileType:  d.fileType,
      createdAt: d.createdAt,
      className: d.class.name,
      classId:   d.classId,
    })));
  } catch (err) {
    next(err);
  }
}

module.exports = { getPresignedUrl, saveMetadata, listDocuments, getDownloadUrl, deleteDocument, myDocuments };
