const UserModel = require('../models/user.model');
const response = require('../utils/response');

const buildPagination = (total, page, limit) => ({
  total, page, limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/**
 * GET /api/v1/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const { users, total } = await UserModel.findAll({
      page: Number(page), limit: Number(limit), search, role,
    });
    return response.paginated(res, users, buildPagination(total, Number(page), Number(limit)));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/users/:id
 */
const getUser = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return response.notFound(res, 'User not found');
    return response.success(res, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/toggle
 */
const toggleUserActive = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return response.badRequest(res, 'You cannot deactivate your own account');
    }
    const updated = await UserModel.toggleActive(req.params.id);
    if (!updated) return response.notFound(res, 'User not found');
    return response.success(res, { user: updated }, `User ${updated.is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return response.badRequest(res, 'Role must be user or admin');
    }
    if (req.params.id === req.user.id) {
      return response.badRequest(res, 'You cannot change your own role');
    }
    const updated = await UserModel.updateRole(req.params.id, role);
    if (!updated) return response.notFound(res, 'User not found');
    return response.success(res, { user: updated }, 'User role updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUser, toggleUserActive, updateUserRole };
