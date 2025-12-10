/**
 * Database factory
 * Creates the appropriate database adapter based on environment configuration
 */

import { logger } from '@md-crafter/shared';
import type { DatabaseAdapter } from './adapters/interface.js';
import { SqliteAdapter } from './adapters/sqlite.js';

/**
 * Create a database adapter based on environment configuration
 * 
 * Priority:
 * 1. DATABASE_URL - PostgreSQL (postgresql://) or MySQL (mysql://)
 * 2. DB_PATH - SQLite file path
 * 3. Default: SQLite at ./data/md-crafter.db
 */
export async function createDatabase(): Promise<DatabaseAdapter> {
  const databaseUrl = process.env.DATABASE_URL;
  const dbPath = process.env.DB_PATH || './data/md-crafter.db';

  if (databaseUrl) {
    if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
      logger.info('Using PostgreSQL database');
      const { PostgresAdapter } = await import('./adapters/postgres.js');
      return new PostgresAdapter(databaseUrl);
    }

    if (databaseUrl.startsWith('mysql://')) {
      logger.info('Using MySQL database');
      const { MysqlAdapter } = await import('./adapters/mysql.js');
      return new MysqlAdapter(databaseUrl);
    }

    throw new Error(`Unsupported database URL scheme: ${databaseUrl.split('://')[0]}`);
  }

  // Default to SQLite
  logger.info('Using SQLite database', { path: dbPath });
  return new SqliteAdapter(dbPath);
}

/**
 * Database type detection
 */
export function getDatabaseType(): 'sqlite' | 'postgresql' | 'mysql' {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return 'sqlite';
  }

  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return 'postgresql';
  }

  if (databaseUrl.startsWith('mysql://')) {
    return 'mysql';
  }

  return 'sqlite';
}

