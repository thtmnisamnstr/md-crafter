/**
 * Generate a simple hash for content (for ETags and change detection)
 * Uses a fast non-cryptographic hash suitable for content comparison
 */
export function generateHash(content: string): string {
  let hash = 0;
  if (content.length === 0) return hash.toString(36);
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to base36 and add timestamp component for uniqueness
  const timestamp = Date.now().toString(36);
  return `${Math.abs(hash).toString(36)}-${timestamp}`;
}

/**
 * Generate a simple content-only hash (without timestamp)
 * Useful for comparing content regardless of when it was hashed
 */
export function generateContentHash(content: string): string {
  let hash = 0;
  if (content.length === 0) return '0';
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (8 characters)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate an API token
 */
export function generateApiToken(): string {
  const segments = [
    generateShortId(),
    generateShortId(),
    generateShortId(),
    generateShortId(),
  ];
  return segments.join('-');
}

