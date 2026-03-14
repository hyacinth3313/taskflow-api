const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

class UserModel {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT id, name, email, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  static async create({ name, email, password, role = 'user' }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name.trim(), email.toLowerCase(), passwordHash, role]
    );
    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id) {
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }

  /**
   * Store hashed refresh token
   */
  static async saveRefreshToken(id, token) {
    const tokenHash = await bcrypt.hash(token, 10);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokenHash, id]);
  }

  /**
   * Verify stored refresh token
   */
  static async verifyRefreshToken(id, token) {
    const result = await query('SELECT refresh_token FROM users WHERE id = $1', [id]);
    if (!result.rows[0]?.refresh_token) return false;
    return bcrypt.compare(token, result.rows[0].refresh_token);
  }

  /**
   * Clear refresh token (logout)
   */
  static async clearRefreshToken(id) {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [id]);
  }

  /**
   * List all users (admin)
   */
  static async findAll({ page = 1, limit = 20, search = '', role = '' } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const usersResult = await query(
      `SELECT id, name, email, role, is_active, last_login, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { users: usersResult.rows, total };
  }

  /**
   * Toggle user active status (admin)
   */
  static async toggleActive(id) {
    const result = await query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Update user role (admin)
   */
  static async updateRole(id, role) {
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );
    return result.rows[0];
  }

  /**
   * Get dashboard stats (admin)
   */
  static async getStats() {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active)            AS total_active,
        COUNT(*) FILTER (WHERE NOT is_active)        AS total_inactive,
        COUNT(*) FILTER (WHERE role = 'admin')       AS total_admins,
        COUNT(*) FILTER (WHERE role = 'user')        AS total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_this_month
      FROM users
    `);
    return result.rows[0];
  }
}

module.exports = UserModel;
