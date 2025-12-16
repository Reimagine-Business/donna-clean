/**
 * Maps database values to user-friendly display labels
 * Database values remain unchanged, only display is affected
 */

import type { EntryType, CategoryType } from './entries';

/**
 * Maps entry type database values to display labels
 * Examples:
 *   "Cash IN" → "CASH IN"
 *   "Cash OUT" → "CASH OUT"
 */
export function getDisplayEntryType(dbEntryType: EntryType): string {
  const mapping: Record<EntryType, string> = {
    'Cash IN': 'CASH IN',
    'Cash OUT': 'CASH OUT',
    'Credit': 'CREDIT',
    'Advance': 'ADVANCE',
  };

  return mapping[dbEntryType] || dbEntryType;
}

/**
 * Maps category database values to display labels
 * Examples:
 *   "Opex" → "OPEX"
 *   "COGS" → "COGS"
 */
export function getDisplayCategory(dbCategory: CategoryType): string {
  const mapping: Record<CategoryType, string> = {
    'Sales': 'Sales',
    'COGS': 'COGS',
    'Opex': 'OPEX',
    'Assets': 'Assets',
  };

  return mapping[dbCategory] || dbCategory;
}

/**
 * Gets color class for entry type
 */
export function getEntryTypeColor(dbEntryType: EntryType): string {
  if (dbEntryType === 'Cash IN') {
    return 'text-green-400';
  }
  if (dbEntryType === 'Cash OUT') {
    return 'text-red-400';
  }
  return 'text-purple-400';
}

/**
 * Gets border color class for entry type
 */
export function getEntryTypeBorderColor(dbEntryType: EntryType): string {
  if (dbEntryType === 'Cash IN') {
    return 'border-green-500';
  }
  if (dbEntryType === 'Cash OUT') {
    return 'border-red-500';
  }
  return 'border-purple-500';
}
