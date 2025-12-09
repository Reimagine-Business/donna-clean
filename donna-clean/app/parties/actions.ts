"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getOrRefreshUser } from "@/lib/supabase/get-user";
import type { Party, CreatePartyInput, UpdatePartyInput } from "@/lib/parties";

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
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return { success: false, error: "Party name is required" };
    }

    if (!input.party_type) {
      return { success: false, error: "Party type is required" };
    }

    const { data, error } = await supabase
      .from("parties")
      .insert({
        user_id: user.id,
        name: input.name.trim(),
        mobile: input.mobile?.trim() || null,
        party_type: input.party_type,
        opening_balance: input.opening_balance || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating party:", error);

      // Handle duplicate name error
      if (error.code === '23505') {
        return { success: false, error: "A party with this name already exists" };
      }

      return { success: false, error: error.message };
    }

    // Revalidate paths that might show parties
    revalidatePath("/daily-entries");
    revalidatePath("/parties");
    revalidatePath("/analytics/cashpulse");

    return { success: true, party: data as Party };
  } catch (error) {
    console.error("Exception in createParty:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create party",
    };
  }
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
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      if (updates.name.trim().length === 0) {
        return { success: false, error: "Party name cannot be empty" };
      }
      updateData.name = updates.name.trim();
    }

    if (updates.mobile !== undefined) {
      updateData.mobile = updates.mobile?.trim() || null;
    }

    if (updates.party_type !== undefined) {
      updateData.party_type = updates.party_type;
    }

    if (updates.opening_balance !== undefined) {
      updateData.opening_balance = updates.opening_balance;
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
        return { success: false, error: "A party with this name already exists" };
      }

      return { success: false, error: error.message };
    }

    // Revalidate paths
    revalidatePath("/daily-entries");
    revalidatePath("/parties");
    revalidatePath("/analytics/cashpulse");

    return { success: true };
  } catch (error) {
    console.error("Exception in updateParty:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update party",
    };
  }
}

/**
 * Delete a party
 * Note: This will set party_id to NULL in all related entries (ON DELETE SET NULL)
 */
export async function deleteParty(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { user } = await getOrRefreshUser(supabase);

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("parties")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting party:", error);
      return { success: false, error: error.message };
    }

    // Revalidate paths
    revalidatePath("/daily-entries");
    revalidatePath("/parties");
    revalidatePath("/analytics/cashpulse");

    return { success: true };
  } catch (error) {
    console.error("Exception in deleteParty:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete party",
    };
  }
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
