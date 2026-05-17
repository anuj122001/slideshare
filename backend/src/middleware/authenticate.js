const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const ApiError = require('../utils/apiError');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No token provided'));
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = authenticate;
