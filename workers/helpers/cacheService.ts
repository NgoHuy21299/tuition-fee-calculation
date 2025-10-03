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

// Environment check for dev logging - Use Cloudflare environment variables
const IS_DEV = (globalThis as any).CF_ENV === 'development' ||
               (globalThis as any).NODE_ENV === 'development' ||
               true; // Default to dev mode for now (can be disabled in production)

export class CacheService {
  constructor(private readonly kv: KVNamespace) {
    if (IS_DEV) {
      console.log(`[CacheService] Initialized with KV namespace`);
    }
  }

  /**
   * Get cached value by key
   * @returns Parsed JSON object or null if not found
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    if (IS_DEV) {
      console.log(`[CacheService] Getting key: "${key}"`);
    }

    try {
      const value = await this.kv.get<T>(key, "json");

      if (IS_DEV) {
        if (value) {
          console.log(`[CacheService] ✅ Cache HIT for key: "${key}"`);
        //   console.log(`[CacheService] Value:`, value);
        } else {
          console.log(`[CacheService] ❌ Cache MISS for key: "${key}"`);
        }
      }

      return value;
    } catch (error) {
      if (IS_DEV) {
        console.error(`[CacheService] ❌ Error getting key "${key}":`, error);
      }
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
    if (IS_DEV) {
      const ttl = options?.ttl ?? 300;
      console.log(`[CacheService] Setting key: "${key}" with TTL: ${ttl}s`);
    //   console.log(`[CacheService] Value preview:`, value);
    }

    try {
      const ttl = options?.ttl ?? 300; // Default 5 minutes
      await this.kv.put(key, JSON.stringify(value), {
        expirationTtl: ttl,
        metadata: options?.metadata,
      });

      if (IS_DEV) {
        console.log(`[CacheService] ✅ Successfully set key: "${key}"`);
      }
    } catch (error) {
      if (IS_DEV) {
        console.error(`[CacheService] ❌ Error setting key "${key}":`, error);
      }
      // Don't throw - cache failures should not break the app
    }
  }

  /**
   * Delete cache entry by key
   */
  async delete(key: string): Promise<void> {
    if (IS_DEV) {
      console.log(`[CacheService] Deleting key: "${key}"`);
    }

    try {
      await this.kv.delete(key);

      if (IS_DEV) {
        console.log(`[CacheService] ✅ Successfully deleted key: "${key}"`);
      }
    } catch (error) {
      if (IS_DEV) {
        console.error(`[CacheService] ❌ Error deleting key "${key}":`, error);
      }
    }
  }

  /**
   * Delete multiple cache entries by prefix
   * Useful for invalidating all related cache entries
   * @param prefix Key prefix to match (e.g., "class:list:")
   */
  async deleteByPrefix(prefix: string): Promise<void> {
    if (IS_DEV) {
      console.log(`[CacheService] Deleting keys by prefix: "${prefix}"`);
    }

    try {
      let cursor: string | undefined;
      let totalDeleted = 0;

      do {
        const list = await this.kv.list({ prefix, cursor });
        const deletePromises = list.keys.map((key) => this.kv.delete(key.name));
        await Promise.all(deletePromises);
        totalDeleted += list.keys.length;
        cursor = list.list_complete ? undefined : list.cursor;

        if (IS_DEV && list.keys.length > 0) {
          console.log(`[CacheService] Deleted ${list.keys.length} keys matching prefix "${prefix}"`);
        }
      } while (cursor);

      if (IS_DEV) {
        console.log(`[CacheService] ✅ Successfully deleted ${totalDeleted} keys by prefix: "${prefix}"`);
      }
    } catch (error) {
      if (IS_DEV) {
        console.error(
          `[CacheService] ❌ Error deleting by prefix "${prefix}":`,
          error
        );
      }
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

    const cacheKey = `${feature}:${operation}:${sortedParams}`;

    if (IS_DEV) {
      console.log(`[CacheService] Built cache key: "${cacheKey}" from:`, params);
    }

    return cacheKey;
  }
}
