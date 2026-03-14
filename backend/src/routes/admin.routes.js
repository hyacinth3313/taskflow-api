const router = require('express').Router();
const { getAllUsers, getUser, toggleUserActive, updateUserRole } = require('../controllers/user.controller');
const { adminGetAllTasks, adminGetStats } = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get global dashboard stats (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global task + user stats
 *       403:
 *         description: Forbidden
 */
router.get('/stats', adminGetStats);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Forbidden
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a specific user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/users/:id', getUser);

/**
 * @swagger
 * /admin/users/{id}/toggle:
 *   patch:
 *     tags: [Users]
 *     summary: Toggle user active/inactive status (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status toggled
 */
router.patch('/users/:id/toggle', toggleUserActive);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/users/:id/role', updateUserRole);

/**
 * @swagger
 * /admin/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks across all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated task list (all users)
 */
router.get('/tasks', adminGetAllTasks);

module.exports = router;
