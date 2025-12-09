import { kv } from '@vercel/kv'

/**
 * Rate limiting using Vercel KV (Redis)
 * Works in serverless environments across all invocations
 */

interface RateLimitConfig {
  limit: number      // Max requests
  window: number     // Time window in seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'create-entry': { limit: 100, window: 86400 },      // 100 per day
  'update-entry': { limit: 200, window: 3600 },       // 200 per hour
  'delete-entry': { limit: 50, window: 3600 },        // 50 per hour
  'settle-entry': { limit: 100, window: 3600 },       // 100 per hour
  'create-party': { limit: 50, window: 86400 },       // 50 per day
  'update-party': { limit: 100, window: 3600 },       // 100 per hour
  'login': { limit: 10, window: 900 },                // 10 per 15 min
  'signup': { limit: 5, window: 3600 },               // 5 per hour
  'default': { limit: 100, window: 3600 },            // Default: 100 per hour
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Check rate limit for a user action
 * @param userId - User ID to rate limit
 * @param action - Action type (e.g., 'create-entry')
 * @throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(
  userId: string,
  action: string
): Promise<void> {
  // Get rate limit config for this action
  const config = RATE_LIMITS[action] || RATE_LIMITS.default

  // Create unique key for this user+action
  const key = `ratelimit:${userId}:${action}`

  try {
    // Get current count
    const count = await kv.incr(key)

    // Set expiry on first request
    if (count === 1) {
      await kv.expire(key, config.window)
    }

    // Check if limit exceeded
    if (count > config.limit) {
      const ttl = await kv.ttl(key)
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(ttl / 60)} minutes.`,
        ttl
      )
    }
  } catch (error) {
    // If it's already a RateLimitError, rethrow it
    if (error instanceof RateLimitError) {
      throw error
    }

    // If KV is down, log error but don't block the request
    // This ensures the app still works if Redis is unavailable
    console.error('Rate limit check failed (KV unavailable):', error)
    // Allow the request to proceed
  }
}

/**
 * Reset rate limit for a user (admin use)
 */
export async function resetRateLimit(
  userId: string,
  action: string
): Promise<void> {
  const key = `ratelimit:${userId}:${action}`
  await kv.del(key)
}

/**
 * Get current rate limit status for a user
 */
export async function getRateLimitStatus(
  userId: string,
  action: string
): Promise<{ count: number; limit: number; remaining: number; resetIn: number }> {
  const config = RATE_LIMITS[action] || RATE_LIMITS.default
  const key = `ratelimit:${userId}:${action}`

  const count = (await kv.get<number>(key)) || 0
  const ttl = await kv.ttl(key)

  return {
    count,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    resetIn: ttl > 0 ? ttl : config.window,
  }
}
