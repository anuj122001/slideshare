const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

async function promoteUser(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return next(new ApiError(400, 'Email is required'));

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) return next(new ApiError(404, 'User not found'));
    if (target.role === 'UPLOADER') return res.json({ message: 'User is already an admin' });

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'UPLOADER' },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ message: 'User promoted to admin', user: updated });
  } catch (err) {
    next(err);
  }
}

async function demoteUser(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return next(new ApiError(400, 'Email is required'));

    if (email === req.user.email) return next(new ApiError(400, 'Cannot demote yourself'));

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) return next(new ApiError(404, 'User not found'));

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'VIEWER' },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ message: 'User demoted to student', user: updated });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { promoteUser, demoteUser, listUsers };
