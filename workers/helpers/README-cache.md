# CacheService - Common Cache Solution

## Overview

`CacheService` là một common utility để làm việc với Cloudflare KV namespace, cung cấp các phương thức đơn giản để get/set/delete cache với JSON serialization.

## Naming Convention

Cache keys tuân theo format:
```
{feature}:{operation}:{param1}_{param2}_{paramN}
```

**Examples:**
- `class:list:teacherId_abc123_isActive_true_sort_createdAt_desc`
- `student:detail:id_xyz789`
- `session:list:classId_abc_status_scheduled`

## Usage

### 1. Inject KV vào Service Dependencies

```typescript
export type MyServiceDeps = { 
  db: D1Database;
  kv?: KVNamespace; // Optional for backward compatibility
};

export class MyService {
  private readonly cache?: CacheService;
  
  constructor(deps: MyServiceDeps) {
    this.cache = deps.kv ? new CacheService(deps.kv) : undefined;
  }
}
```

### 2. Implement Cache-Aside Pattern

```typescript
async listByTeacher(params: {
  teacherId: string;
  isActive?: boolean;
  sort?: string;
  limit?: number;
}): Promise<{ items: DTO[]; total: number }> {
  // Try cache first
  if (this.cache) {
    const cacheKey = CacheService.buildKey("class", "list", {
      teacherId: params.teacherId,
      isActive: params.isActive,
      sort: params.sort,
      limit: params.limit,
    });
    
    const cached = await this.cache.get<{ items: DTO[]; total: number }>(cacheKey);
    if (cached) {
      console.log(`[Service] Cache hit: ${cacheKey}`);
      return cached;
    }
    
    console.log(`[Service] Cache miss: ${cacheKey}`);
  }
  
  // Fetch from database
  const result = await this.repo.fetchData(params);
  
  // Store in cache (TTL: 5 minutes)
  if (this.cache) {
    const cacheKey = CacheService.buildKey("class", "list", {
      teacherId: params.teacherId,
      isActive: params.isActive,
      sort: params.sort,
      limit: params.limit,
    });
    await this.cache.set(cacheKey, result, { ttl: 300 });
  }
  
  return result;
}
```

### 3. Cache Invalidation

**Invalidate specific key:**
```typescript
async update(id: string, data: UpdateInput): Promise<DTO> {
  await this.repo.update(id, data);
  
  // Invalidate specific cache
  if (this.cache) {
    await this.cache.delete(`myfeature:detail:id_${id}`);
  }
  
  return result;
}
```

**Invalidate by prefix (recommended for list operations):**
```typescript
async create(teacherId: string, data: CreateInput): Promise<DTO> {
  await this.repo.create(data);
  
  // Invalidate all list caches for this teacher
  if (this.cache) {
    await this.cache.deleteByPrefix(`class:list:teacherId_${teacherId}`);
  }
  
  return result;
}
```

### 4. Inject KV in Routes

```typescript
router.get("/", async (c) => {
  const svc = new MyService({ 
    db: c.env.DB, 
    kv: c.env.KV  // Inject KV namespace
  });
  
  const result = await svc.listByTeacher(params);
  return c.json(result);
});
```

## API Reference

### `CacheService.buildKey(feature, operation, params)`
Build standardized cache key from parameters.

**Parameters:**
- `feature`: Feature name (e.g., "class", "student")
- `operation`: Operation name (e.g., "list", "detail")
- `params`: Object with parameters (will be sorted alphabetically)

**Returns:** Formatted cache key string

### `cache.get<T>(key)`
Get cached value by key.

**Returns:** Parsed JSON object or `null` if not found

### `cache.set<T>(key, value, options?)`
Set cache value with JSON serialization.

**Options:**
- `ttl`: Time-to-live in seconds (default: 300 = 5 minutes)
- `metadata`: Optional metadata object

### `cache.delete(key)`
Delete single cache entry by key.

### `cache.deleteByPrefix(prefix)`
Delete all cache entries matching prefix. Useful for invalidating related caches.

## Best Practices

1. **Always make KV optional** - Service should work without cache
2. **Use cache.deleteByPrefix()** for list invalidation - More reliable than tracking individual keys
3. **Set appropriate TTL** - Balance between freshness and performance
4. **Log cache hits/misses** - Helps with debugging and monitoring
5. **Don't throw on cache errors** - Cache failures should not break the app
6. **Use consistent naming** - Follow the `{feature}:{operation}:{params}` convention

## Example: Complete Implementation

See `workers/features/class/classService.ts` for a complete example of:
- Cache-aside pattern in `listByTeacher()`
- Cache invalidation in `create()`, `update()`, `delete()`
- Proper KV injection in `classRoute.ts`
