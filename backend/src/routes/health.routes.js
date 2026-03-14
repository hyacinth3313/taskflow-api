const router = require('express').Router();
const { pool } = require('../config/database');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check API health status
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 */
router.get('/', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'disconnected';
  }

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded';
  res.status(dbStatus === 'connected' ? 200 : 503).json({
    success: true,
    status,
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
