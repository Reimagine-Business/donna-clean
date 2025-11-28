/**
 * Sanitization utilities for user inputs
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

/**
 * Sanitize string input
 * - Trim whitespace
 * - Remove/escape HTML tags
 * - Limit length
 */
export function sanitizeString(input: string | undefined | null, maxLength: number = 1000): string {
  if (!input) return ''

  // Trim whitespace
  let sanitized = input.trim()

  // Remove HTML tags (basic XSS prevention)
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Escape special HTML characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitize number input
 * - Ensure it's a valid number
 * - Round to specified decimal places
 */
export function sanitizeNumber(input: number | string, decimalPlaces: number = 2): number {
  const num = typeof input === 'string' ? parseFloat(input) : input

  if (isNaN(num) || !isFinite(num)) {
    return 0
  }

  // Round to specified decimal places
  return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
}

/**
 * Sanitize category name
 * - Allow only alphanumeric, spaces, hyphens, underscores
 * - Trim and limit length
 */
export function sanitizeCategoryName(name: string | undefined | null): string {
  if (!name) return ''

  // Trim and convert to string
  let sanitized = String(name).trim()

  // Remove special characters except spaces, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_]/g, '')

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ')

  // Limit length
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50)
  }

  return sanitized
}

/**
 * Sanitize email
 * - Convert to lowercase
 * - Trim whitespace
 * - Basic format check
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return ''

  return email.trim().toLowerCase()
}

/**
 * Sanitize hex color
 * - Ensure it starts with #
 * - Remove invalid characters
 * - Validate format
 */
export function sanitizeColor(color: string | undefined | null): string {
  if (!color) return '#000000'

  let sanitized = color.trim()

  // Add # if missing
  if (!sanitized.startsWith('#')) {
    sanitized = '#' + sanitized
  }

  // Remove non-hex characters
  sanitized = sanitized.replace(/[^#0-9A-Fa-f]/g, '')

  // Validate length (should be #RGB or #RRGGBB)
  if (sanitized.length !== 4 && sanitized.length !== 7) {
    return '#000000'
  }

  return sanitized
}

/**
 * Sanitize filename
 * - Remove path traversal attempts
 * - Remove special characters
 * - Limit length
 */
export function sanitizeFilename(filename: string | undefined | null): string {
  if (!filename) return ''

  let sanitized = filename.trim()

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '')
  sanitized = sanitized.replace(/\//g, '')
  sanitized = sanitized.replace(/\\/g, '')

  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_')

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    const name = sanitized.substring(0, 255 - ext.length)
    sanitized = name + ext
  }

  return sanitized
}

/**
 * Sanitize description/notes
 * - Allow basic formatting but escape HTML
 * - Preserve line breaks
 * - Limit length
 */
export function sanitizeText(text: string | undefined | null, maxLength: number = 1000): string {
  if (!text) return ''

  let sanitized = text.trim()

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Preserve line breaks (convert to <br> if needed for display)
  // But don't actually convert here to avoid XSS

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitize date string
 * - Ensure it's in ISO format
 * - Remove time component if present
 */
export function sanitizeDate(date: string | undefined | null): string {
  if (!date) return ''

  // Remove time component, keep only date
  const dateOnly = date.split('T')[0]

  // Basic format check (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateOnly)) {
    return ''
  }

  return dateOnly
}

/**
 * Sanitize amount for currency
 * - Ensure positive number
 * - Round to 2 decimal places
 * - Remove any currency symbols
 */
export function sanitizeAmount(amount: string | number): number {
  let num: number

  if (typeof amount === 'string') {
    // Remove currency symbols and commas
    const cleaned = amount.replace(/[₹,\s]/g, '')
    num = parseFloat(cleaned)
  } else {
    num = amount
  }

  if (isNaN(num) || !isFinite(num)) {
    return 0
  }

  // Ensure positive
  num = Math.abs(num)

  // Round to 2 decimal places
  return Math.round(num * 100) / 100
}

/**
 * Sanitize object with multiple fields
 * Useful for sanitizing entire form data
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fields: Record<keyof T, 'string' | 'number' | 'email' | 'date' | 'color' | 'text'>
): Partial<T> {
  const sanitized: Partial<T> = {}

  for (const key in fields) {
    const value = obj[key]
    const type = fields[key]

    switch (type) {
      case 'string':
        sanitized[key] = sanitizeString(value) as any
        break
      case 'number':
        sanitized[key] = sanitizeNumber(value) as any
        break
      case 'email':
        sanitized[key] = sanitizeEmail(value) as any
        break
      case 'date':
        sanitized[key] = sanitizeDate(value) as any
        break
      case 'color':
        sanitized[key] = sanitizeColor(value) as any
        break
      case 'text':
        sanitized[key] = sanitizeText(value) as any
        break
      default:
        sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Rate limiting helpers
 */

// Simple in-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if action is rate limited
 * @param key - Unique identifier (e.g., userId + action)
 * @param limit - Max actions allowed
 * @param windowMs - Time window in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (record.count >= limit) {
    return true // Rate limited
  }

  // Increment count
  record.count++
  return false
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}
