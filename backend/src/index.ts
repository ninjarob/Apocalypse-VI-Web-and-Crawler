import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { initDatabase, closeDatabase } from './database';
import { responseTime, errorHandler, notFoundHandler } from './middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(responseTime);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Consolidated API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 handler for all unmatched routes (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Database connection and server start
async function start() {
  try {
    await initDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
