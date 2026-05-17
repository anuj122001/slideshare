const { z } = require('zod');
const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

const createClassSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

async function listClasses(req, res, next) {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { documents: { where: { deletedAt: null } } } },
      },
    });

    res.json(classes.map((c) => ({
      id:          c.id,
      name:        c.name,
      description: c.description,
      documentCount: c._count.documents,
      createdAt:   c.createdAt,
    })));
  } catch (err) {
    next(err);
  }
}

async function createClass(req, res, next) {
  try {
    const { name, description } = createClassSchema.parse(req.body);

    const existing = await prisma.class.findUnique({ where: { name } });
    if (existing) return next(new ApiError(409, 'Class already exists'));

    const cls = await prisma.class.create({ data: { name, description } });
    res.status(201).json(cls);
  } catch (err) {
    next(err);
  }
}

module.exports = { listClasses, createClass };
