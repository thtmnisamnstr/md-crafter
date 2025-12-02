import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database types
export interface User {
  id: string;
  email: string | null;
  api_token: string;
  settings_json: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  language: string;
  etag: string;
  is_cloud_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  content: string;
  version_number: number;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  documents: Document[];
  document_versions: DocumentVersion[];
}

const defaultData: DatabaseSchema = {
  users: [],
  documents: [],
  document_versions: [],
};

let db: Low<DatabaseSchema>;

export async function setupDatabase(): Promise<Low<DatabaseSchema>> {
  if (db) return db;
  
  const dbPath = process.env.DB_FILENAME || './data/md-edit.json';
  const fullPath = join(process.cwd(), dbPath);
  const dir = dirname(fullPath);
  
  // Ensure data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const adapter = new JSONFile<DatabaseSchema>(fullPath);
  db = new Low<DatabaseSchema>(adapter, defaultData);
  
  await db.read();
  
  // Initialize with default data if empty
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  
  console.log('Database initialized at:', fullPath);
  return db;
}

export function getDatabase(): Low<DatabaseSchema> {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

// Helper functions for database operations
export const dbHelpers = {
  // Users
  async findUserByToken(token: string): Promise<User | undefined> {
    const database = getDatabase();
    return database.data.users.find((u) => u.api_token === token);
  },
  
  async findUserById(id: string): Promise<User | undefined> {
    const database = getDatabase();
    return database.data.users.find((u) => u.id === id);
  },
  
  async findUserByEmail(email: string): Promise<User | undefined> {
    const database = getDatabase();
    return database.data.users.find((u) => u.email === email);
  },
  
  async createUser(user: User): Promise<User> {
    const database = getDatabase();
    database.data.users.push(user);
    await database.write();
    return user;
  },
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const database = getDatabase();
    const index = database.data.users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    
    database.data.users[index] = { ...database.data.users[index], ...updates };
    await database.write();
    return database.data.users[index];
  },
  
  // Documents
  async findDocumentsByUserId(userId: string): Promise<Document[]> {
    const database = getDatabase();
    return database.data.documents.filter((d) => d.user_id === userId);
  },
  
  async findDocumentById(id: string): Promise<Document | undefined> {
    const database = getDatabase();
    return database.data.documents.find((d) => d.id === id);
  },
  
  async createDocument(doc: Document): Promise<Document> {
    const database = getDatabase();
    database.data.documents.push(doc);
    await database.write();
    return doc;
  },
  
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const database = getDatabase();
    const index = database.data.documents.findIndex((d) => d.id === id);
    if (index === -1) return undefined;
    
    database.data.documents[index] = { ...database.data.documents[index], ...updates };
    await database.write();
    return database.data.documents[index];
  },
  
  async deleteDocument(id: string): Promise<boolean> {
    const database = getDatabase();
    const initialLength = database.data.documents.length;
    database.data.documents = database.data.documents.filter((d) => d.id !== id);
    database.data.document_versions = database.data.document_versions.filter(
      (v) => v.document_id !== id
    );
    await database.write();
    return database.data.documents.length < initialLength;
  },
  
  // Document Versions
  async findVersionsByDocumentId(documentId: string): Promise<DocumentVersion[]> {
    const database = getDatabase();
    return database.data.document_versions
      .filter((v) => v.document_id === documentId)
      .sort((a, b) => b.version_number - a.version_number);
  },
  
  async findVersionById(id: string): Promise<DocumentVersion | undefined> {
    const database = getDatabase();
    return database.data.document_versions.find((v) => v.id === id);
  },
  
  async createVersion(version: DocumentVersion): Promise<DocumentVersion> {
    const database = getDatabase();
    database.data.document_versions.push(version);
    await database.write();
    return version;
  },
  
  async getMaxVersionNumber(documentId: string): Promise<number> {
    const database = getDatabase();
    const versions = database.data.document_versions.filter(
      (v) => v.document_id === documentId
    );
    if (versions.length === 0) return 0;
    return Math.max(...versions.map((v) => v.version_number));
  },
  
  async cleanupOldVersions(documentId: string, maxVersions: number): Promise<void> {
    const database = getDatabase();
    const versions = database.data.document_versions
      .filter((v) => v.document_id === documentId)
      .sort((a, b) => b.version_number - a.version_number);
    
    if (versions.length > maxVersions) {
      const toDelete = versions.slice(maxVersions).map((v) => v.id);
      database.data.document_versions = database.data.document_versions.filter(
        (v) => !toDelete.includes(v.id)
      );
      await database.write();
    }
  },
};
