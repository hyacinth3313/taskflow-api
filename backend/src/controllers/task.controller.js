const TaskModel = require('../models/task.model');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Build pagination meta
 */
const buildPagination = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/**
 * POST /api/v1/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const task = await TaskModel.create({ ...req.body, user_id: req.user.id });
    logger.info(`Task created: ${task.id} by user ${req.user.id}`);
    return response.created(res, { task }, 'Task created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, search, sortBy, sortOrder } = req.query;
    const { tasks, total } = await TaskModel.findByUser(req.user.id, {
      page: Number(page), limit: Number(limit), status, priority, search, sortBy, sortOrder,
    });
    const pagination = buildPagination(total, Number(page), Number(limit));
    return response.paginated(res, tasks, pagination, 'Tasks retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = async (req, res, next) => {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) return response.notFound(res, 'Task not found');
    // Non-admins can only see their own tasks
    if (req.user.role !== 'admin' && task.user_id !== req.user.id) {
      return response.forbidden(res, 'Access denied');
    }
    return response.success(res, { task });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const existing = await TaskModel.findById(req.params.id);
    if (!existing) return response.notFound(res, 'Task not found');
    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return response.forbidden(res, 'Access denied');
    }
    const updated = await TaskModel.update(req.params.id, req.body);
    return response.success(res, { task: updated }, 'Task updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const existing = await TaskModel.findById(req.params.id);
    if (!existing) return response.notFound(res, 'Task not found');
    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return response.forbidden(res, 'Access denied');
    }
    await TaskModel.delete(req.params.id);
    logger.info(`Task deleted: ${req.params.id} by user ${req.user.id}`);
    return response.success(res, {}, 'Task deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/stats
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await TaskModel.getStatsByUser(req.user.id);
    return response.success(res, { stats });
  } catch (err) {
    next(err);
  }
};

// ===== ADMIN CONTROLLERS =====

/**
 * GET /api/v1/admin/tasks
 */
const adminGetAllTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, userId, search } = req.query;
    const { tasks, total } = await TaskModel.findAll({
      page: Number(page), limit: Number(limit), status, priority, userId, search,
    });
    const pagination = buildPagination(total, Number(page), Number(limit));
    return response.paginated(res, tasks, pagination, 'All tasks retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/stats
 */
const adminGetStats = async (req, res, next) => {
  try {
    const taskStats = await TaskModel.getGlobalStats();
    const UserModel = require('../models/user.model');
    const userStats = await UserModel.getStats();
    return response.success(res, { tasks: taskStats, users: userStats }, 'Admin stats retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, getStats, adminGetAllTasks, adminGetStats };
