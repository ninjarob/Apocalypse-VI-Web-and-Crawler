import winston from 'winston';
import path from 'path';

// Logs should go to crawler/logs/ regardless of where compiled code is
const logDir = path.join(__dirname, '../../../logs');

// Create timestamped filenames for each run
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const errorLogFile = path.join(logDir, `error-${timestamp}.log`);
const combinedLogFile = path.join(logDir, `combined-${timestamp}.log`);

// Filter out verbose backend connection errors
const filterBackendErrors = winston.format((info) => {
  // Check if this is a backend connection error
  if (info.level === 'error' && 
      info.message && 
      typeof info.message === 'object' &&
      (info.message as any).code === 'ECONNREFUSED' &&
      (info.message as any).config?.url?.includes('localhost:3002')) {
    return false; // Don't log this
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterBackendErrors(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: errorLogFile, 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: combinedLogFile 
    }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
