/**
 * Action Wrapper - Centralized security for server actions
 *
 * Combines:
 * - Rate limiting (Vercel KV)
 * - Input validation
 * - XSS sanitization
 * - Error handling with Sentry
 *
 * Usage:
 * ```typescript
 * return protectedAction(user.id, {
 *   rateLimitKey: 'create-entry',
 *   validateInputs: async () => validateEntryInput(data)
 * }, async () => {
 *   // Your action logic here
 * })
 * ```
 */

import { checkRateLimit, RateLimitError } from './rate-limit';
import { validateAmount, validateDate } from './validation';
import { sanitizeString } from './sanitization';
import * as Sentry from '@sentry/nextjs';

type ActionConfig = {
  rateLimitKey: string;
  validateInputs?: () => Promise<{ isValid: boolean; error?: string }> | { isValid: boolean; error?: string };
};

type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Protected action wrapper with rate limiting, validation, and error handling
 */
export async function protectedAction<T>(
  userId: string,
  config: ActionConfig,
  action: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    // 1. Rate Limiting Check
    try {
      await checkRateLimit(userId, config.rateLimitKey);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: false,
          error: `Too many requests. Please try again in ${Math.ceil(error.retryAfter / 60)} minutes.`
        };
      }
      throw error; // Re-throw if not rate limit error
    }

    // 2. Input Validation (if provided)
    if (config.validateInputs) {
      const validation = await config.validateInputs();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Invalid input'
        };
      }
    }

    // 3. Execute action
    const result = await action();

    return {
      success: true,
      data: result
    };

  } catch (error) {
    // 4. Error Handling with Sentry
    console.error(`[protectedAction] Error in ${config.rateLimitKey}:`, error);

    Sentry.captureException(error, {
      tags: {
        action: config.rateLimitKey,
        userId
      },
      extra: {
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Validate entry input (amount + date)
 */
export function validateEntryInput(data: {
  amount: number | string;
  entry_date: string;
}): { isValid: boolean; error?: string } {
  // Validate amount
  const amountValidation = validateAmount(data.amount);
  if (!amountValidation.isValid) {
    return amountValidation;
  }

  // Validate date
  const dateValidation = validateDate(data.entry_date);
  if (!dateValidation.isValid) {
    return dateValidation;
  }

  return { isValid: true };
}

/**
 * Sanitize entry input to prevent XSS
 */
export function sanitizeEntryInput<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    notes: data.notes ? sanitizeString(data.notes) : null,
    category: data.category ? sanitizeString(data.category) : data.category,
  };
}

/**
 * Validate party input (name + mobile)
 */
export function validatePartyInput(data: {
  name: string;
  mobile?: string;
}): { isValid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { isValid: false, error: 'Party name is required' };
  }

  if (data.name.trim().length > 100) {
    return { isValid: false, error: 'Party name must be less than 100 characters' };
  }

  if (data.mobile && data.mobile.trim().length > 0) {
    // Basic mobile validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(data.mobile.replace(/\s/g, ''))) {
      return { isValid: false, error: 'Mobile number must be 10 digits' };
    }
  }

  return { isValid: true };
}

/**
 * Sanitize party input
 */
export function sanitizePartyInput<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    name: sanitizeString(data.name),
    mobile: data.mobile ? sanitizeString(data.mobile) : data.mobile,
  };
}
