const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { jwtSecret, jwtRefreshSecret, jwtAccessExpires, jwtRefreshExpires } = require('../config/env');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth.validator');
const ApiError = require('../utils/apiError');

function signAccessToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtAccessExpires });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpires });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return next(new ApiError(409, 'Email already registered'));

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: 'VIEWER' },
      select: { id: true, name: true, email: true, role: true },
    });

    const accessToken  = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new ApiError(401, 'Invalid credentials'));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return next(new ApiError(401, 'Invalid credentials'));

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: user.id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return next(new ApiError(401, 'Refresh token invalid or expired'));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    } catch {
      return next(new ApiError(401, 'Refresh token invalid'));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return next(new ApiError(401, 'User not found'));

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const newRefresh = signRefreshToken({ id: user.id });
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt } });

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
