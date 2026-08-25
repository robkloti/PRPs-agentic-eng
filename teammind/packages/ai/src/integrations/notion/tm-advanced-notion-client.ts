/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '@notionhq/client';
import { APIResponseError, isNotionClientError } from '@notionhq/client';
import { ClientOptions } from '@notionhq/client/build/src/Client';
import type {
  GetPageResponse,
  ListBlockChildrenResponse,
  SearchParameters,
  SearchResponse,
} from '@notionhq/client/build/src/api-endpoints';

/**
 * A sliding window rate limiter for the Notion API.
 * Ensures requests conform to Notion's rate limits of 2700 requests per 15 minutes.
 */
export class NotionRateLimiter {
  private static instance: NotionRateLimiter;
  private requestTimestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  private constructor(maxRequests = 2700, windowMinutes = 15) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  /**
   * Get the singleton instance of the rate limiter.
   */
  public static getInstance(
    maxRequests?: number,
    windowMinutes?: number,
  ): NotionRateLimiter {
    if (!NotionRateLimiter.instance) {
      NotionRateLimiter.instance = new NotionRateLimiter(
        maxRequests,
        windowMinutes,
      );
    }
    return NotionRateLimiter.instance;
  }

  /**
   * Remove timestamps that are outside the sliding window
   */
  private cleanStaleTimestamps(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove timestamps that are older than our window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > windowStart,
    );
  }

  /**
   * Acquire permission before making a request.
   * Waits if we've hit the rate limit.
   */
  public async acquirePermission(): Promise<void> {
    this.cleanStaleTimestamps();

    if (this.requestTimestamps.length >= this.maxRequests) {
      // Sort timestamps to find the oldest one
      this.requestTimestamps.sort((a, b) => a - b);

      // Calculate when the oldest request will expire from our window
      const oldestTimestamp = this.requestTimestamps[0]!;
      const expiryTime = oldestTimestamp + this.windowMs;
      const waitTime = expiryTime - Date.now();

      console.warn(
        `Notion API rate limit reached (2700/15min): waiting ${Math.ceil(waitTime / 1000)}s`,
      );

      // Wait until we can make another request
      await new Promise((resolve) => setTimeout(resolve, waitTime + 50)); // Add 50ms buffer

      // Clean up timestamps again and check if we can proceed
      this.cleanStaleTimestamps();

      // If we're still at the limit (unlikely but possible if clock changed), recurse
      if (this.requestTimestamps.length >= this.maxRequests) {
        return this.acquirePermission();
      }
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Get the number of requests remaining in the current window
   */
  public getRemainingRequests(): number {
    this.cleanStaleTimestamps();
    return this.maxRequests - this.requestTimestamps.length;
  }
}

type ProxyObject = Record<string, unknown>;
type CacheItem<T> = { data: T; expires: number };

export class CachingRateLimitedNotionClient extends Client {
  private client: Client;
  private rateLimiter: NotionRateLimiter;
  private cache = new Map<string, CacheItem<any>>();
  private cacheTTL: number;
  private debug: boolean;

  public readonly blocks: typeof Client.prototype.blocks;
  public readonly pages: typeof Client.prototype.pages;
  public readonly databases: typeof Client.prototype.databases;
  public readonly users: typeof Client.prototype.users;
  public readonly comments: typeof Client.prototype.comments;

  constructor(
    options: ClientOptions & {
      rateLimiterOptions?: {
        maxRequestsPer15Min?: number;
      };
      cacheOptions?: {
        ttl?: number; // cache TTL in milliseconds
        debug?: boolean; // Enable debug logging for cache operations
      };
    },
  ) {
    super();
    // Extract options
    const { rateLimiterOptions, cacheOptions, ...clientOptions } = options;

    this.client = new Client(clientOptions);
    this.cacheTTL = cacheOptions?.ttl ?? 15 * 60 * 1000; // Default 15 minutes
    this.debug = cacheOptions?.debug ?? false;
    this.rateLimiter = NotionRateLimiter.getInstance(
      rateLimiterOptions?.maxRequestsPer15Min,
    );

    // Create proxies for the API endpoints with proper typing
    this.blocks = this.createApiProxy(this.client.blocks);
    this.pages = this.createApiProxy(this.client.pages);
    this.databases = this.createApiProxy(this.client.databases);
    this.users = this.createApiProxy(this.client.users);
    this.comments = this.createApiProxy(this.client.comments);

    // Create the search method (handled separately)
    this.search = this.createSearchMethod();
  }

  /**
   * Creates a proxy that intercepts all API object calls.
   */
  private createApiProxy<T extends ProxyObject>(apiObject: T): T {
    return new Proxy(apiObject, {
      get: (target: T, prop: string | symbol) => {
        if (typeof prop !== 'string') {
          return target[prop as unknown as keyof T];
        }

        const value = target[prop as keyof T];

        if (typeof value === 'function') {
          // If it's a function, wrap it with rate limiting and caching
          return this.wrapMethod(value.bind(target));
        }

        if (typeof value === 'object' && value !== null) {
          // If it's an object (like .children for blocks), create a nested proxy
          return this.createApiProxy(value as ProxyObject);
        }

        // Otherwise, return the value as is
        return value;
      },
    });
  }

  /**
   * Generate a cache key from method name and arguments
   */
  private generateCacheKey(methodPath: string, args: unknown[]): string {
    try {
      // Extract the resource ID from the arguments
      const resourceId = this.extractResourceId(methodPath, args);

      if (resourceId) {
        // For resource IDs, ONLY use the resource type and ID
        // WITHOUT including the method path to ensure cross-method caching
        if (methodPath.includes('blocks/children/list')) {
          // Special case for block children, as this is a parent-child relationship
          return `notion:block-children:${resourceId}`;
        } else if (methodPath.includes('block')) {
          return `notion:block:${resourceId}`;
        } else if (methodPath.includes('page')) {
          return `notion:page:${resourceId}`;
        } else if (methodPath.includes('database')) {
          return `notion:database:${resourceId}`;
        }
      }

      // Fall back to the method-based cache key if we can't extract a resource ID
      return `notion:${methodPath}:${JSON.stringify(args)}`;
    } catch (e) {
      console.error(
        `[NOTION CACHE] Failed to generate cache key for method: ${methodPath}`,
        e,
      );
      // If args can't be stringified, use a simpler key
      return `notion:${methodPath}:${new Date().getTime()}`;
    }
  }

  /**
   * Extract a resource ID from method arguments
   */
  private extractResourceId(
    methodPath: string,
    args: unknown[],
  ): string | null {
    if (!args.length || typeof args[0] !== 'object' || args[0] === null) {
      return null;
    }

    const arg = args[0] as Record<string, any>;

    // Check for various ID fields
    if (arg.block_id) return arg.block_id;
    if (arg.page_id) return arg.page_id;
    if (arg.database_id) return arg.database_id;

    return null;
  }

  /**
   * Check if method should be cached based on method name and arguments
   */
  private shouldCache(methodPath: string): boolean {
    // List of methods that modify data and should not be cached
    const nonCacheableMethods = [
      'create',
      'update',
      'append',
      'delete',
      'archive',
    ];

    // Don't cache if it's a method that modifies data
    if (nonCacheableMethods.some((m) => methodPath.includes(m))) {
      return false;
    }

    return true;
  }

  /**
   * Wraps a method with rate limiting and caching logic.
   */
  private wrapMethod<T extends unknown[], R>(
    method: (...args: T) => Promise<R>,
  ): (...args: T) => Promise<R> {
    // Get method name by analyzing the function's toString representation
    const methodName = method.name || 'unknown';
    // Try to extract an API path from the method
    const methodPath = method.toString().includes('this.request')
      ? (/this\.request\(['"]([^'"]+)/.exec(method.toString())?.[1] ??
        methodName)
      : methodName;

    return async (...args: T): Promise<R> => {
      // Only use cache for GET operations
      if (this.shouldCache(methodPath)) {
        const cacheKey = this.generateCacheKey(methodPath, args);
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expires > Date.now()) {
          if (this.debug) {
            console.log(`[NOTION CACHE] Cache hit for: ${cacheKey}`);
          }
          return cached.data;
        } else if (this.debug && cached) {
          console.log(`[NOTION CACHE] Cache expired for: ${cacheKey}`);
        }
      }

      // If not in cache or shouldn't cache, proceed with the API call
      await this.rateLimiter.acquirePermission();

      try {
        const result = await method(...args);

        // Cache the result if it's a cacheable method
        if (this.shouldCache(methodPath)) {
          const cacheKey = this.generateCacheKey(methodPath, args);
          this.cache.set(cacheKey, {
            data: result,
            expires: Date.now() + this.cacheTTL,
          });

          if (this.debug) {
            console.log(`[NOTION CACHE] Cached result for: ${cacheKey}`);
          }

          // Special handling for page/block retrieval to extract additional cacheable data
          if (
            methodPath.includes('pages/retrieve') &&
            'id' in (result as any)
          ) {
            this.cachePageFromResponse(result as GetPageResponse);
          }

          if (methodPath.includes('blocks/children/list')) {
            this.cacheBlockChildrenFromResponse(
              args[0],
              result as ListBlockChildrenResponse,
            );
          }
        }

        return result;
      } catch (error) {
        // Handle rate limiting
        if (
          isNotionClientError(error) &&
          error instanceof APIResponseError &&
          error.status === 429 &&
          typeof error.headers === 'object' &&
          error.headers !== null &&
          'retry-after' in error.headers
        ) {
          const retryAfterHeader = String(error.headers['retry-after']);
          const parsedValue = parseInt(retryAfterHeader, 10);
          const retryAfter = !isNaN(parsedValue) ? parsedValue * 1000 : 5000;
          console.warn(
            `Notion API rate limited: retrying after ${retryAfter}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return this.wrapMethod(method)(...args);
        }
        throw error;
      }
    };
  }

  /**
   * Create a specialized search method that extracts and caches results
   */
  private createSearchMethod(): (
    params: SearchParameters,
  ) => Promise<SearchResponse> {
    const searchMethod = this.client.search.bind(this.client);

    return async (params: SearchParameters): Promise<SearchResponse> => {
      // Check cache first
      const cacheKey = this.generateCacheKey('search', [params]);
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expires > Date.now()) {
        if (this.debug) {
          console.log(
            `[NOTION CACHE] Cache hit for search: ${JSON.stringify(params)}`,
          );
        }
        return cached.data;
      }

      // If not in cache, make the API call
      await this.rateLimiter.acquirePermission();

      try {
        const result = await searchMethod(params);

        // Cache the search results
        this.cache.set(cacheKey, {
          data: result,
          expires: Date.now() + this.cacheTTL,
        });

        if (this.debug) {
          console.log(
            `[NOTION CACHE] Cached search results for: ${JSON.stringify(params)}`,
          );
        }

        // Extract and cache individual pages/databases from the results
        if (result.results && Array.isArray(result.results)) {
          this.extractAndCacheFromSearchResults(result.results);
        }

        return result;
      } catch (error) {
        // Handle rate limiting
        if (
          isNotionClientError(error) &&
          error instanceof APIResponseError &&
          error.status === 429 &&
          typeof error.headers === 'object' &&
          error.headers !== null &&
          'retry-after' in error.headers
        ) {
          const retryAfterHeader = String(error.headers['retry-after']);
          const parsedValue = parseInt(retryAfterHeader, 10);
          const retryAfter = !isNaN(parsedValue) ? parsedValue * 1000 : 5000;
          console.warn(
            `Notion API rate limited: retrying after ${retryAfter}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return this.createSearchMethod()(params);
        }
        throw error;
      }
    };
  }

  /**
   * Cache page data from a page response
   */
  private cachePageFromResponse(page: GetPageResponse): void {
    if (page.object === 'page' && 'id' in page) {
      const pageKey = this.generateCacheKey('pages/retrieve', [
        { page_id: page.id },
      ]);
      this.cache.set(pageKey, {
        data: page,
        expires: Date.now() + this.cacheTTL,
      });

      if (this.debug) {
        console.log(`[NOTION CACHE] Cached page from response: ${page.id}`);
      }
    }
  }

  /**
   * Cache block children data from a list response
   */
  private cacheBlockChildrenFromResponse(
    params: any,
    response: ListBlockChildrenResponse,
  ): void {
    if (params?.block_id) {
      const blockId = params.block_id;
      const blockChildrenKey = this.generateCacheKey('blocks/children/list', [
        { block_id: blockId },
      ]);

      this.cache.set(blockChildrenKey, {
        data: response,
        expires: Date.now() + this.cacheTTL,
      });

      if (this.debug) {
        console.log(`[NOTION CACHE] Cached block children for: ${blockId}`);
      }
    }
  }

  /**
   * Extract and cache pages/databases from search results
   */
  private extractAndCacheFromSearchResults(results: any[]): void {
    for (const item of results) {
      if (!item?.id) continue;

      // Use simple, consistent cache keys that don't include method names
      if (item.object === 'page') {
        // Store using ONLY notion:page:id format - much simpler
        this.cache.set(`notion:page:${item.id}`, {
          data: item,
          expires: Date.now() + this.cacheTTL,
        });

        if (this.debug) {
          console.log(`[NOTION CACHE] Cached page from search: ${item.id}`);
        }
      } else if (item.object === 'block') {
        // Store blocks with simple keys
        this.cache.set(`notion:block:${item.id}`, {
          data: item,
          expires: Date.now() + this.cacheTTL,
        });
      } else if (item.object === 'database') {
        // Store databases with simple keys
        this.cache.set(`notion:database:${item.id}`, {
          data: item,
          expires: Date.now() + this.cacheTTL,
        });
      }
    }
  }
  /**
   * Manually add an item to the cache
   */
  public addToCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl ?? this.cacheTTL),
    });

    if (this.debug) {
      console.log(`[NOTION CACHE] Manually added to cache: ${key}`);
    }
  }

  /**
   * Retrieve an item from the cache
   */
  public getFromCache<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      if (this.debug) {
        console.log(`[NOTION CACHE] Retrieved from cache: ${key}`);
      }
      return cached.data;
    }
    return undefined;
  }

  /**
   * Cache a page by ID
   */
  public cachePage(pageId: string, pageData: any, ttl?: number): void {
    const key = this.generateCacheKey('pages/retrieve', [{ page_id: pageId }]);
    this.addToCache(key, pageData, ttl);
  }

  /**
   * Get cached page by ID
   */
  public getCachedPage(pageId: string): any {
    const key = this.generateCacheKey('pages/retrieve', [{ page_id: pageId }]);
    return this.getFromCache(key);
  }

  /**
   * Cache block children for a block
   */
  public cacheBlockChildren(
    blockId: string,
    childrenData: any,
    ttl?: number,
  ): void {
    const key = this.generateCacheKey('blocks/children/list', [
      { block_id: blockId },
    ]);
    this.addToCache(key, childrenData, ttl);
  }

  /**
   * Get cached block children for a block
   */
  public getCachedBlockChildren(blockId: string): any {
    const key = this.generateCacheKey('blocks/children/list', [
      { block_id: blockId },
    ]);
    return this.getFromCache(key);
  }

  /**
   * Invalidate cache entries that match a pattern
   */
  public invalidateCache(pattern: string): void {
    const invalidated: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated.push(key);
      }
    }

    if (this.debug && invalidated.length > 0) {
      console.log(
        `[NOTION CACHE] Invalidated ${invalidated.length} cache entries matching: ${pattern}`,
      );
    }
  }

  /**
   * Invalidate cache for a specific page
   */
  public invalidatePage(pageId: string): void {
    this.invalidateCache(`page_id":"${pageId}`);
    this.invalidateCache(`${pageId}`);
  }

  /**
   * Invalidate cache for a specific block
   */
  public invalidateBlock(blockId: string): void {
    this.invalidateCache(`block_id":"${blockId}`);
    this.invalidateCache(`${blockId}`);
  }

  /**
   * Clear the entire cache
   */
  public clearCache(): void {
    const count = this.cache.size;
    this.cache.clear();

    if (this.debug) {
      console.log(`[NOTION CACHE] Cleared entire cache (${count} entries)`);
    }
  }

  /**
   * Get the number of entries in the cache
   */
  public getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get the number of API requests remaining in the current window
   */
  public getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests();
  }

  /**
   * The search method
   */
  public search: (params: SearchParameters) => Promise<SearchResponse>;
}
