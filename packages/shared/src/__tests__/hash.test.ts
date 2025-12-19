import { describe, it, expect } from 'vitest';
import {
  generateHash,
  generateContentHash,
  generateUUID,
  generateShortId,
  generateApiToken,
} from '../utils/hash.js';

describe('generateHash', () => {
  it('should generate a hash for content', () => {
    const hash = generateHash('Hello, World!');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should generate different hashes for different content', () => {
    const hash1 = generateHash('Hello');
    const hash2 = generateHash('World');
    // Note: The content part before the timestamp should be different
    expect(hash1.split('-')[0]).not.toBe(hash2.split('-')[0]);
  });

  it('should handle empty string', () => {
    const hash = generateHash('');
    expect(hash).toBeDefined();
    // Empty string returns just the hash without timestamp
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle unicode content', () => {
    const hash = generateHash('你好世界');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle special characters', () => {
    const hash = generateHash('!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('generateContentHash', () => {
  it('should generate consistent hash for same content', () => {
    const content = 'Hello, World!';
    const hash1 = generateContentHash(content);
    const hash2 = generateContentHash(content);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different content', () => {
    const hash1 = generateContentHash('Hello');
    const hash2 = generateContentHash('World');
    expect(hash1).not.toBe(hash2);
  });

  it('should return "0" for empty string', () => {
    const hash = generateContentHash('');
    expect(hash).toBe('0');
  });

  it('should handle unicode content consistently', () => {
    const hash1 = generateContentHash('你好世界');
    const hash2 = generateContentHash('你好世界');
    expect(hash1).toBe(hash2);
  });
});

describe('generateUUID', () => {
  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
  });

  it('should always have "4" in the version position', () => {
    const uuid = generateUUID();
    expect(uuid[14]).toBe('4');
  });

  it('should have valid variant bits', () => {
    const uuid = generateUUID();
    const variantChar = uuid[19];
    expect(['8', '9', 'a', 'b']).toContain(variantChar);
  });
});

describe('generateShortId', () => {
  it('should generate an 8 character ID', () => {
    const id = generateShortId();
    expect(id.length).toBe(8);
  });

  it('should only contain alphanumeric characters', () => {
    const id = generateShortId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateShortId());
    }
    // Allow for small chance of collision
    expect(ids.size).toBeGreaterThanOrEqual(95);
  });
});

describe('generateApiToken', () => {
  it('should generate a token with 4 segments separated by dashes', () => {
    const token = generateApiToken();
    const segments = token.split('-');
    expect(segments.length).toBe(4);
  });

  it('should have segments of 8 characters each', () => {
    const token = generateApiToken();
    const segments = token.split('-');
    segments.forEach((segment) => {
      expect(segment.length).toBe(8);
    });
  });

  it('should generate unique tokens', () => {
    const token1 = generateApiToken();
    const token2 = generateApiToken();
    expect(token1).not.toBe(token2);
  });

  it('should be 35 characters total (4*8 + 3 dashes)', () => {
    const token = generateApiToken();
    expect(token.length).toBe(35);
  });
});

