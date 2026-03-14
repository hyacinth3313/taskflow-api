const { query } = require('../config/database');

class TaskModel {
  /**
   * Create a new task
   */
  static async create({ title, description, status, priority, due_date, tags, user_id }) {
    const result = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, tags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        status || 'todo',
        priority || 'medium',
        due_date || null,
        tags || [],
        user_id,
      ]
    );
    return result.rows[0];
  }

  /**
   * Find task by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all tasks for a user with filtering, sorting, and pagination
   */
  static async findByUser(userId, { page = 1, limit = 10, status, priority, search, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['user_id = $1'];
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const validSort = ['created_at', 'updated_at', 'title', 'priority', 'due_date', 'status'];
    const col = validSort.includes(sortBy) ? sortBy : 'created_at';
    const dir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(`SELECT COUNT(*) FROM tasks ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const tasksResult = await query(
      `SELECT * FROM tasks ${where} ORDER BY ${col} ${dir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { tasks: tasksResult.rows, total };
  }

  /**
   * Get ALL tasks (admin view)
   */
  static async findAll({ page = 1, limit = 20, status, priority, userId, search } = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status) { conditions.push(`t.status = $${paramIndex++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${paramIndex++}`); params.push(priority); }
    if (userId) { conditions.push(`t.user_id = $${paramIndex++}`); params.push(userId); }
    if (search) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countResult = await query(
      `SELECT COUNT(*) FROM tasks t ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const tasksResult = await query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return { tasks: tasksResult.rows, total };
  }

  /**
   * Update task (partial update)
   */
  static async update(id, updates) {
    const allowed = ['title', 'description', 'status', 'priority', 'due_date', 'tags'];
    const fields = Object.keys(updates).filter(k => allowed.includes(k));
    if (fields.length === 0) return null;

    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`);
    const values = fields.map(f => updates[f]);

    const result = await query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete task
   */
  static async delete(id) {
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  /**
   * Task statistics for dashboard
   */
  static async getStatsByUser(userId) {
    const result = await query(
      `SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE status = 'todo')       AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')        AS done,
        COUNT(*) FILTER (WHERE priority = 'high')      AS high_priority,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') AS overdue
       FROM tasks WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Global stats (admin)
   */
  static async getGlobalStats() {
    const result = await query(`
      SELECT
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE status = 'todo')         AS todo,
        COUNT(*) FILTER (WHERE status = 'in_progress')  AS in_progress,
        COUNT(*) FILTER (WHERE status = 'done')          AS done,
        COUNT(*) FILTER (WHERE priority = 'high')        AS high_priority,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') AS overdue,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS created_this_month
      FROM tasks
    `);
    return result.rows[0];
  }
}

module.exports = TaskModel;
