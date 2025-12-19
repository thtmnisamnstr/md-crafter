import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDatabase, getDatabaseType } from '../../db/factory.js';

// Mock the adapters with proper classes
vi.mock('../../db/adapters/sqlite.js', () => ({
  SqliteAdapter: class MockSqliteAdapter {
    type = 'sqlite';
    path: string;
    constructor(path: string) {
      this.path = path;
    }
    initialize = vi.fn();
    close = vi.fn();
  },
}));

vi.mock('../../db/adapters/postgres.js', () => ({
  PostgresAdapter: class MockPostgresAdapter {
    type = 'postgresql';
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    initialize = vi.fn();
    close = vi.fn();
  },
}));

vi.mock('../../db/adapters/mysql.js', () => ({
  MysqlAdapter: class MockMysqlAdapter {
    type = 'mysql';
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    initialize = vi.fn();
    close = vi.fn();
  },
}));

// Mock shared package
vi.mock('@md-crafter/shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Database Factory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('createDatabase', () => {
    it('should create SQLite adapter by default', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_PATH;

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'sqlite');
      expect(db).toHaveProperty('path', './data/md-crafter.db');
    });

    it('should create SQLite adapter with custom path', async () => {
      delete process.env.DATABASE_URL;
      process.env.DB_PATH = '/custom/path/test.db';

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'sqlite');
      expect(db).toHaveProperty('path', '/custom/path/test.db');
    });

    it('should create PostgreSQL adapter with postgresql:// URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/mydb';

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'postgresql');
      expect(db).toHaveProperty('url', 'postgresql://user:pass@localhost:5432/mydb');
    });

    it('should create PostgreSQL adapter with postgres:// URL', async () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/mydb';

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'postgresql');
      expect(db).toHaveProperty('url', 'postgres://user:pass@localhost:5432/mydb');
    });

    it('should create MySQL adapter with mysql:// URL', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/mydb';

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'mysql');
      expect(db).toHaveProperty('url', 'mysql://user:pass@localhost:3306/mydb');
    });

    it('should throw for unsupported database URL scheme', async () => {
      process.env.DATABASE_URL = 'mongodb://localhost:27017/mydb';

      await expect(createDatabase()).rejects.toThrow('Unsupported database URL scheme: mongodb');
    });

    it('should prioritize DATABASE_URL over DB_PATH', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost/mydb';
      process.env.DB_PATH = '/some/sqlite/path.db';

      const db = await createDatabase();

      expect(db).toHaveProperty('type', 'postgresql');
    });
  });

  describe('getDatabaseType', () => {
    it('should return sqlite when no DATABASE_URL is set', () => {
      delete process.env.DATABASE_URL;

      expect(getDatabaseType()).toBe('sqlite');
    });

    it('should return postgresql for postgresql:// URL', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';

      expect(getDatabaseType()).toBe('postgresql');
    });

    it('should return postgresql for postgres:// URL', () => {
      process.env.DATABASE_URL = 'postgres://localhost/db';

      expect(getDatabaseType()).toBe('postgresql');
    });

    it('should return mysql for mysql:// URL', () => {
      process.env.DATABASE_URL = 'mysql://localhost/db';

      expect(getDatabaseType()).toBe('mysql');
    });

    it('should return sqlite for unrecognized URL scheme', () => {
      process.env.DATABASE_URL = 'unknown://localhost/db';

      expect(getDatabaseType()).toBe('sqlite');
    });
  });
});

