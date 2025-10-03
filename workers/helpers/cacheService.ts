/**
 * Common Cache Service for Cloudflare KV
 * 
 * Naming convention for cache keys:
 * {feature}:{operation}:{param1}_{param2}_{paramN}
 * 
 * Examples:
 * - class:list:teacher_abc123_active_true
 * - student:detail:id_xyz789
 * - session:list:class_abc_status_scheduled
 */

export interface CacheOptions {
  /**
   * Time-to-live in seconds. Default: 300 (5 minutes)
   */
  ttl?: number;
  /**
   * Metadata to store with the cache entry
   */
  metadata?: Record<string, unknown>;
}

export class CacheService {
  constructor(private readonly kv: KVNamespace) {}

  /**
   * Get cached value by key
   * @returns Parsed JSON object or null if not found
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get<T>(key, "json");
      return value;
    } catch (error) {
      console.error(`[CacheService] Error getting key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set cache value with JSON serialization
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param options Cache options (TTL, metadata)
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const ttl = options?.ttl ?? 300; // Default 5 minutes
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl,
        metadata: options?.metadata,
      });
    } catch (error) {
      console.error(`[CacheService] Error setting key "${key}":`, error);
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Delete cache entry by key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`[CacheService] Error deleting key "${key}":`, error);
    }
  }

  /**
   * Delete multiple cache entries by prefix
   * Useful for invalidating all related cache entries
   * @param prefix Key prefix to match (e.g., "class:list:")
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      let cursor: string | undefined;
      do {
        const list = await this.kv.list({ prefix, cursor });
        const deletePromises = list.keys.map((key) => this.kv.delete(key.name));
        await Promise.all(deletePromises);
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);
    } catch (error) {
      console.error(
        `[CacheService] Error deleting by prefix "${prefix}":`,
        error
      );
    }
  }

  /**
   * Build cache key from feature, operation, and parameters
   * @param feature Feature name (e.g., "class", "student")
   * @param operation Operation name (e.g., "list", "detail")
   * @param params Parameters object
   * @returns Formatted cache key
   */
  static buildKey(
    feature: string,
    operation: string,
    params: Record<string, unknown>
  ): string {
    const sortedParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}_${String(value)}`)
      .join("_");

    return `${feature}:${operation}:${sortedParams}`;
  }
}
