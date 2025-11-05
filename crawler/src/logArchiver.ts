import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Log Archiver - Continuously moves logs older than 30 minutes to archive folder
 */
export class LogArchiver {
  private logsDir: string;
  private archiveDir: string;
  private intervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(logsDir: string = 'logs', archiveDir: string = 'logs/archive', intervalMs: number = 60000) {
    this.logsDir = path.resolve(logsDir);
    this.archiveDir = path.resolve(archiveDir);
    this.intervalMs = intervalMs; // Default: check every minute
  }

  /**
   * Start the archiver
   */
  start(): void {
    // Create archive directory if it doesn't exist
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
      logger.info(`📁 Created archive directory: ${this.archiveDir}`);
    }

    // Run immediately
    this.archiveLogs();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.archiveLogs();
    }, this.intervalMs);

    logger.info(`🗄️  Log archiver started (checking every ${this.intervalMs / 1000}s, archiving logs older than 30 minutes)`);
  }

  /**
   * Stop the archiver
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🗄️  Log archiver stopped');
    }
  }

  /**
   * Archive logs older than 30 minutes
   */
  private archiveLogs(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return;
      }

      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const thirtyMinutesAgo = now - (30 * 60 * 1000); // 30 minutes in milliseconds
      let archivedCount = 0;

      for (const file of files) {
        // Skip directories (like the archive folder itself)
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          continue;
        }

        // Skip non-log files and current.log (keep it for analysis)
        if (!file.endsWith('.log') || file === 'current.log') {
          continue;
        }

        // Check if file is older than 30 minutes
        const fileModifiedTime = stats.mtime.getTime();
        
        if (fileModifiedTime < thirtyMinutesAgo) {
          // Move to archive
          const archivePath = path.join(this.archiveDir, file);
          
          try {
            fs.renameSync(filePath, archivePath);
            archivedCount++;
            logger.info(`📦 Archived old log: ${file}`);
          } catch (error) {
            logger.error(`Failed to archive ${file}:`, error);
          }
        }
      }

      if (archivedCount > 0) {
        logger.info(`📦 Archived ${archivedCount} log file(s)`);
      }

    } catch (error) {
      logger.error('Error during log archival:', error);
    }
  }

  /**
   * Get archive statistics
   */
  getStats(): { activeLogCount: number; archivedLogCount: number; archiveSize: number } {
    let activeLogCount = 0;
    let archivedLogCount = 0;
    let archiveSize = 0;

    // Count active logs
    if (fs.existsSync(this.logsDir)) {
      const files = fs.readdirSync(this.logsDir);
      activeLogCount = files.filter(f => {
        const filePath = path.join(this.logsDir, f);
        return fs.statSync(filePath).isFile() && f.endsWith('.log');
      }).length;
    }

    // Count archived logs and calculate size
    if (fs.existsSync(this.archiveDir)) {
      const files = fs.readdirSync(this.archiveDir);
      files.forEach(f => {
        const filePath = path.join(this.archiveDir, f);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && f.endsWith('.log')) {
          archivedLogCount++;
          archiveSize += stats.size;
        }
      });
    }

    return { activeLogCount, archivedLogCount, archiveSize };
  }

  /**
   * Clean up archived logs older than a certain number of days
   */
  cleanOldArchives(daysToKeep: number = 7): void {
    try {
      if (!fs.existsSync(this.archiveDir)) {
        return;
      }

      const files = fs.readdirSync(this.archiveDir);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.archiveDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && file.endsWith('.log')) {
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
            logger.info(`🗑️  Deleted old archive: ${file}`);
          }
        }
      }

      if (deletedCount > 0) {
        logger.info(`🗑️  Deleted ${deletedCount} old archived log(s)`);
      }

    } catch (error) {
      logger.error('Error cleaning old archives:', error);
    }
  }
}
