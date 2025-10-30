import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create separate logger for command interactions
export const commandLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'commands.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Main application logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
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

/**
 * Log a command interaction with full details
 */
export function logCommandInteraction(data: {
  command: string;
  response: string;
  success: boolean;
  category?: string;
  aiAnalysis?: any;
  timestamp?: Date;
}) {
  commandLogger.info('COMMAND_INTERACTION', {
    ...data,
    timestamp: data.timestamp || new Date(),
    responseLength: data.response.length,
    responseTruncated: data.response.substring(0, 500)
  });
}

/**
 * Log AI decision making
 */
export function logAIDecision(data: {
  prompt: string;
  decision: string;
  context: any;
  timestamp?: Date;
}) {
  logger.info('AI_DECISION', {
    ...data,
    timestamp: data.timestamp || new Date(),
    promptLength: data.prompt.length
  });
}

export default logger;
