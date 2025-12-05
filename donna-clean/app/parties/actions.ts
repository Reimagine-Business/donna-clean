"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import type { Party, CreatePartyInput, UpdatePartyInput } from "@/lib/parties";
import { protectedAction, validatePartyInput, sanitizePartyInput } from "@/lib/action-wrapper";
import * as Sentry from '@sentry/nextjs';

/**
 * Get all parties for the current user
 */
export async function getParties(): Promise<{
  success: boolean;
  parties?: Party[];
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("parties")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching parties:", error);
      return { success: false, error: error.message };
    }

    return { success: true, parties: data as Party[] };
  } catch (error) {
    console.error("Exception in getParties:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch parties",
    };
  }
}

/**
 * Get a single party by ID
 */
export async function getParty(id: string): Promise<{
  success: boolean;
  party?: Party;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("parties")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching party:", error);
      return { success: false, error: error.message };
    }

    return { success: true, party: data as Party };
  } catch (error) {
    console.error("Exception in getParty:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch party",
    };
  }
}

/**
 * Create a new party
 */
export async function createParty(input: CreatePartyInput): Promise<{
  success: boolean;
  party?: Party;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Apply security wrapper with rate limiting, validation, and error handling
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'create-party',
      validateInputs: () => validatePartyInput(input)
    },
    async () => {
      if (!input.party_type) {
        throw new Error("Party type is required");
      }

      // Sanitize inputs to prevent XSS
      const sanitizedInput = sanitizePartyInput(input);

      const { data, error } = await supabase
        .from("parties")
        .insert({
          user_id: user.id,
          name: sanitizedInput.name.trim(),
          mobile: sanitizedInput.mobile?.trim() || null,
          party_type: sanitizedInput.party_type,
          opening_balance: sanitizedInput.opening_balance || 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating party:", error);

        // Handle duplicate name error
        if (error.code === '23505') {
          throw new Error("A party with this name already exists");
        }

        throw new Error(error.message);
      }

      // Revalidate paths that might show parties
      revalidatePath("/daily-entries");
      revalidatePath("/parties");
      revalidatePath("/analytics/cashpulse");

      return { success: true, party: data as Party };
    }
  );
}

/**
 * Update an existing party
 */
export async function updateParty(
  id: string,
  updates: UpdatePartyInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Apply security wrapper
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'update-party',
      validateInputs: updates.name ? () => validatePartyInput({ name: updates.name!, mobile: updates.mobile }) : undefined
    },
    async () => {
      // Sanitize inputs
      const sanitizedUpdates = updates.name || updates.mobile ? sanitizePartyInput(updates as any) : updates;

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (sanitizedUpdates.name !== undefined) {
        if (sanitizedUpdates.name.trim().length === 0) {
          throw new Error("Party name cannot be empty");
        }
        updateData.name = sanitizedUpdates.name.trim();
      }

      if (sanitizedUpdates.mobile !== undefined) {
        updateData.mobile = sanitizedUpdates.mobile?.trim() || null;
      }

      if (sanitizedUpdates.party_type !== undefined) {
        updateData.party_type = sanitizedUpdates.party_type;
      }

      if (sanitizedUpdates.opening_balance !== undefined) {
        updateData.opening_balance = sanitizedUpdates.opening_balance;
      }

      const { error } = await supabase
        .from("parties")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating party:", error);

        // Handle duplicate name error
        if (error.code === '23505') {
          throw new Error("A party with this name already exists");
        }

        throw new Error(error.message);
      }

      // Revalidate paths
      revalidatePath("/daily-entries");
      revalidatePath("/parties");
      revalidatePath("/analytics/cashpulse");

      return { success: true };
    }
  );
}

/**
 * Delete a party
 * Note: This will set party_id to NULL in all related entries (ON DELETE SET NULL)
 */
export async function deleteParty(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  const { user } = await getOrRefreshUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Apply security wrapper (rate limiting + error handling)
  return protectedAction(
    user.id,
    {
      rateLimitKey: 'delete-party'
    },
    async () => {
      const { error } = await supabase
        .from("parties")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting party:", error);
        throw new Error(error.message);
      }

      // Revalidate paths
      revalidatePath("/daily-entries");
      revalidatePath("/parties");
      revalidatePath("/analytics/cashpulse");

      return { success: true };
    }
  );
}

/**
 * Get party balance (opening balance + all transactions)
 */
export async function getPartyBalance(partyId: string): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase.rpc('get_party_balance', {
      p_party_id: partyId,
    });

    if (error) {
      console.error("Error getting party balance:", error);
      return { success: false, error: error.message };
    }

    return { success: true, balance: data };
  } catch (error) {
    console.error("Exception in getPartyBalance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get party balance",
    };
  }
}
