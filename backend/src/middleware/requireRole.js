const ApiError = require('../utils/apiError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}

module.exports = requireRole;
