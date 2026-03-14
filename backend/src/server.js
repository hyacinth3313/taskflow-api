require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const PORT = parseInt(process.env.PORT) || 3001;

const startServer = async () => {
  try {
    // Test DB connection
    await pool.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 TaskFlow API running on port ${PORT}`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health:   http://localhost:${PORT}/api/v1/health`);
      logger.info(`🌍 Env:      ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received – shutting down gracefully`);
      server.close(async () => {
        await pool.end();
        logger.info('Database pool closed');
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
