const UserModel = require('../models/user.model');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check duplicate email
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return response.conflict(res, 'An account with this email already exists');
    }

    const user = await UserModel.create({ name, email, password });
    const tokens = generateTokens({ id: user.id, role: user.role });
    await UserModel.saveRefreshToken(user.id, tokens.refreshToken);

    logger.info(`New user registered: ${user.email}`);

    return response.created(res, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return response.unauthorized(res, 'Invalid email or password');
    }

    const isValid = await UserModel.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return response.unauthorized(res, 'Invalid email or password');
    }

    if (!user.is_active) {
      return response.unauthorized(res, 'Your account has been deactivated. Contact support.');
    }

    const tokens = generateTokens({ id: user.id, role: user.role });
    await UserModel.saveRefreshToken(user.id, tokens.refreshToken);
    await UserModel.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    return response.success(res, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return response.unauthorized(res, 'Invalid or expired refresh token');
    }

    const user = await UserModel.findById(decoded.id);
    if (!user || !user.is_active) {
      return response.unauthorized(res, 'User not found or deactivated');
    }

    const isTokenValid = await UserModel.verifyRefreshToken(decoded.id, refreshToken);
    if (!isTokenValid) {
      return response.unauthorized(res, 'Refresh token has been revoked');
    }

    const tokens = generateTokens({ id: user.id, role: user.role });
    await UserModel.saveRefreshToken(user.id, tokens.refreshToken);

    return response.success(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await UserModel.clearRefreshToken(req.user.id);
    logger.info(`User logged out: ${req.user.email}`);
    return response.success(res, {}, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    return response.success(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, getProfile };
