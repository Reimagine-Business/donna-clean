/**
 * TypeScript types and interfaces for Parties (Customers & Vendors) feature
 *
 * This file defines types for party management without modifying existing Entry types.
 * All changes are additive and backward-compatible.
 */

export type PartyType = 'Customer' | 'Vendor' | 'Both';

/**
 * Party represents a customer or vendor in the system
 */
export interface Party {
  id: string;
  user_id: string;
  name: string;
  mobile?: string;
  party_type: PartyType;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new party
 */
export interface CreatePartyInput {
  name: string;
  mobile?: string;
  party_type: PartyType;
  opening_balance?: number;
}

/**
 * Input for updating an existing party
 */
export interface UpdatePartyInput {
  name?: string;
  mobile?: string;
  party_type?: PartyType;
  opening_balance?: number;
}

/**
 * Party with calculated current balance
 */
export interface PartyWithBalance extends Party {
  current_balance: number;
}

/**
 * Result type for party operations
 */
export type PartyOperationResult =
  | {
      success: true;
      party?: Party;
      parties?: Party[];
    }
  | {
      success: false;
      error: string;
      party?: undefined;
      parties?: undefined;
    };

/**
 * Helper function to determine if a party type is valid
 */
export function isValidPartyType(type: string): type is PartyType {
  return type === 'Customer' || type === 'Vendor' || type === 'Both';
}

/**
 * Helper function to get party type display name
 */
export function getPartyTypeLabel(type: PartyType): string {
  switch (type) {
    case 'Customer':
      return 'Customer';
    case 'Vendor':
      return 'Vendor';
    case 'Both':
      return 'Both';
    default:
      return type;
  }
}

/**
 * Helper function to determine which party type to show based on entry details
 * Returns the party type that should be selectable for the given entry configuration
 */
export function getRequiredPartyType(
  entryType: string,
  category?: string
): PartyType | null {
  // Credit sales -> Customer
  if (entryType === 'Credit' && category === 'Sales') {
    return 'Customer';
  }

  // Credit purchases (COGS, Opex, Assets) -> Vendor
  if (entryType === 'Credit' && ['COGS', 'Opex', 'Assets'].includes(category || '')) {
    return 'Vendor';
  }

  // Advance received (Sales) -> Customer
  if (entryType === 'Advance' && category === 'Sales') {
    return 'Customer';
  }

  // Advance paid (COGS, Opex, Assets) -> Vendor
  if (entryType === 'Advance' && ['COGS', 'Opex', 'Assets'].includes(category || '')) {
    return 'Vendor';
  }

  // Cash IN/OUT don't require parties
  return null;
}

/**
 * Filter parties by type, including 'Both'
 */
export function filterPartiesByType(parties: Party[], requiredType: PartyType): Party[] {
  return parties.filter(
    (p) => p.party_type === requiredType || p.party_type === 'Both'
  );
}
