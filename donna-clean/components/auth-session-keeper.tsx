"use client";

/**
 * DEPRECATED: This component is no longer needed and should NOT be used.
 * 
 * Session refresh is now handled by middleware (at /middleware.ts).
 * Client-side session refresh causes:
 * - 429 Rate Limiting errors
 * - Conflicts with middleware refresh logic
 * - Unnecessary network requests
 * 
 * DO NOT import or use this component.
 */

export function AuthSessionKeeper() {
  // Disabled - middleware handles all session refresh
  return null;
}
