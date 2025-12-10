import { Document, CreateDocumentRequest, UpdateDocumentRequest, logger } from '@md-crafter/shared';

/**
 * Service for making HTTP API requests to the backend
 * 
 * Handles authentication, document CRUD operations, and synchronization.
 * Automatically includes authentication tokens in request headers.
 */
class ApiService {
  private token: string | null = null;
  private baseUrl: string = '/api';

  setToken(token: string | null) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    // Normalize URL: remove trailing slash, ensure it ends with /api
    let normalized = url.replace(/\/$/, '');
    if (!normalized.endsWith('/api')) {
      normalized = normalized + '/api';
    }
    this.baseUrl = normalized;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async generateToken(email?: string): Promise<{ userId: string; apiToken: string }> {
    return this.fetch('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const result = await this.fetch<{ valid: boolean }>('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      return result.valid;
    } catch (error) {
      logger.error('Token validation failed', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<{ id: string; email?: string }> {
    return this.fetch('/auth/me');
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    const result = await this.fetch<{ documents: Document[] }>('/documents');
    return result.documents;
  }

  async getDocument(id: string): Promise<Document> {
    return this.fetch(`/documents/${id}`);
  }

  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    return this.fetch('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(id: string, data: Partial<UpdateDocumentRequest>): Promise<Document> {
    return this.fetch(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Syncs document content with the server, detecting conflicts
   * 
   * Sends document content with local timestamp. Server compares with remote version
   * and returns either success or conflict information if concurrent edits detected.
   * 
   * @param id - Document ID to sync
   * @param content - Current document content
   * @returns Promise resolving to sync result with potential conflict information
   */
  async syncDocument(id: string, content: string): Promise<{
    success: boolean;
    document?: Document;
    conflict?: { serverContent: string; serverEtag: string; serverTimestamp: number };
  }> {
    return this.fetch(`/documents/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ content, localTimestamp: Date.now() }),
    });
  }

  async getDocumentVersions(id: string): Promise<{
    versions: Array<{ id: string; versionNumber: number; createdAt: string }>;
  }> {
    return this.fetch(`/documents/${id}/versions`);
  }

  async getDocumentVersion(docId: string, versionId: string): Promise<{
    id: string;
    content: string;
    versionNumber: number;
    createdAt: string;
  }> {
    return this.fetch(`/documents/${docId}/versions/${versionId}`);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.fetch(`/documents/${id}`, { method: 'DELETE' });
  }

  // Settings
  async getSettings(): Promise<Record<string, unknown>> {
    const result = await this.fetch<{ settings: Record<string, unknown> }>('/settings');
    return result.settings;
  }

  async updateSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.fetch<{ settings: Record<string, unknown> }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    return result.settings;
  }
}

export const api = new ApiService();

