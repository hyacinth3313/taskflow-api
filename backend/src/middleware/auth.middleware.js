const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const UserModel = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Authenticate request via Bearer JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Authorization header missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB (detects deactivated accounts)
    const user = await UserModel.findById(decoded.id);
    if (!user) return unauthorized(res, 'User not found');
    if (!user.is_active) return unauthorized(res, 'Account has been deactivated');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid access token');
    }
    logger.error('Auth middleware error:', err);
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Require specific roles
 * Usage: authorize('admin') or authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res, 'Not authenticated');
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `This action requires one of: ${roles.join(', ')}`);
    }
    next();
  };
};

/**
 * Ensure user can only access their own resources (or is admin)
 */
const authorizeOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.user_id;
  if (req.user.role === 'admin' || req.user.id === resourceUserId) {
    return next();
  }
  return forbidden(res, 'You can only access your own resources');
};

module.exports = { authenticate, authorize, authorizeOwnerOrAdmin };
