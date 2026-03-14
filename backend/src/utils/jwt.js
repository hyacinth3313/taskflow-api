const jwt = require('jsonwebtoken');
const logger = require('./logger');

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production_32chars';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_prod';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate access + refresh token pair
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });

  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });

  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: 'taskflow-api',
    audience: 'taskflow-client',
  });
};

/**
 * Decode without verifying (for debugging)
 */
const decodeToken = (token) => jwt.decode(token);

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken, decodeToken };
