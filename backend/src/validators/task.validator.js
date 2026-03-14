const { body, param, query } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description too long (max 2000 chars)'),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),

  body('due_date')
    .optional()
    .isISO8601().withMessage('due_date must be a valid ISO date (YYYY-MM-DD)')
    .toDate(),

  body('tags')
    .optional()
    .isArray().withMessage('tags must be an array')
    .custom((tags) => {
      if (tags.some(t => typeof t !== 'string' || t.length > 30)) {
        throw new Error('Each tag must be a string under 30 characters');
      }
      return true;
    }),
];

const updateTaskValidator = [
  param('id').isUUID().withMessage('Invalid task ID'),
  ...createTaskValidator.map(v => v.optional ? v : v),
];

const taskQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
  query('status').optional().isIn(['todo', 'in_progress', 'done']),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'title', 'priority', 'due_date', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

module.exports = { createTaskValidator, updateTaskValidator, taskQueryValidator };
