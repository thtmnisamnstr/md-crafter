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

  /**
   * Sets the authentication token for API requests
   * 
   * @param token - Bearer token string, or null to clear authentication
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Sets the base URL for API requests
   * 
   * Normalizes the URL by removing trailing slashes and ensuring it ends with /api.
   * 
   * @param url - Base URL (e.g., 'https://api.example.com' or 'https://api.example.com/api')
   */
  setBaseUrl(url: string) {
    // Normalize URL: remove trailing slash, ensure it ends with /api
    let normalized = url.replace(/\/$/, '');
    if (!normalized.endsWith('/api')) {
      normalized = normalized + '/api';
    }
    this.baseUrl = normalized;
  }

  /**
   * Gets the current base URL for API requests
   * 
   * @returns The base URL string
   */
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
      let error: { error?: string } = { error: 'Request failed' };
      try {
        error = await response.json();
      } catch {
        // If JSON parsing fails, use status code
        error = { error: `HTTP ${response.status}` };
      }
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  /**
   * Generates a new API token for authentication
   * 
   * @param email - Optional email address for token generation
   * @returns Promise resolving to user ID and API token
   * @throws Error if token generation fails
   */
  async generateToken(email?: string): Promise<{ userId: string; apiToken: string }> {
    return this.fetch('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Validates an API token
   * 
   * @param token - Token string to validate
   * @returns Promise resolving to true if token is valid, false otherwise
   */
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

  /**
   * Gets the current authenticated user information
   * 
   * @returns Promise resolving to user ID and optional email
   * @throws Error if not authenticated or request fails
   */
  async getCurrentUser(): Promise<{ id: string; email?: string }> {
    return this.fetch('/auth/me');
  }

  // Documents
  /**
   * Gets all documents for the authenticated user
   * 
   * @returns Promise resolving to array of documents
   * @throws Error if request fails
   */
  async getDocuments(): Promise<Document[]> {
    const result = await this.fetch<{ documents: Document[] }>('/documents');
    return result.documents;
  }

  /**
   * Gets a single document by ID
   * 
   * @param id - Document ID
   * @returns Promise resolving to document
   * @throws Error if document not found or request fails
   */
  async getDocument(id: string): Promise<Document> {
    return this.fetch(`/documents/${id}`);
  }

  /**
   * Creates a new document
   * 
   * @param data - Document creation data
   * @returns Promise resolving to created document
   * @throws Error if creation fails
   */
  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    return this.fetch('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Updates an existing document
   * 
   * @param id - Document ID
   * @param data - Partial document data to update
   * @returns Promise resolving to updated document
   * @throws Error if update fails
   */
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

  /**
   * Gets all versions of a document
   * 
   * @param id - Document ID
   * @returns Promise resolving to array of version metadata
   * @throws Error if request fails
   */
  async getDocumentVersions(id: string): Promise<{
    versions: Array<{ id: string; versionNumber: number; createdAt: string }>;
  }> {
    return this.fetch(`/documents/${id}/versions`);
  }

  /**
   * Gets a specific version of a document
   * 
   * @param docId - Document ID
   * @param versionId - Version ID
   * @returns Promise resolving to version content and metadata
   * @throws Error if version not found or request fails
   */
  async getDocumentVersion(docId: string, versionId: string): Promise<{
    id: string;
    content: string;
    versionNumber: number;
    createdAt: string;
  }> {
    return this.fetch(`/documents/${docId}/versions/${versionId}`);
  }

  /**
   * Deletes a document
   * 
   * @param id - Document ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if deletion fails
   */
  async deleteDocument(id: string): Promise<void> {
    await this.fetch(`/documents/${id}`, { method: 'DELETE' });
  }

  // Settings
  /**
   * Gets user settings
   * 
   * @returns Promise resolving to settings object
   * @throws Error if request fails
   */
  async getSettings(): Promise<Record<string, unknown>> {
    const result = await this.fetch<{ settings: Record<string, unknown> }>('/settings');
    return result.settings;
  }

  /**
   * Updates user settings
   * 
   * @param settings - Settings object to update
   * @returns Promise resolving to updated settings
   * @throws Error if update fails
   */
  async updateSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.fetch<{ settings: Record<string, unknown> }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    return result.settings;
  }
}

export const api = new ApiService();

