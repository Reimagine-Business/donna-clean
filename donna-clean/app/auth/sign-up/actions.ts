'use server';

import { createSupabaseServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

interface SignupData {
  email: string;
  password: string;
  businessName: string;
  username: string;
  phone?: string;
}

/**
 * Complete user signup with extended profile data
 * This is called after the user clicks the invitation link
 */
export async function completeSignup(data: SignupData) {
  const supabase = await createSupabaseServerClient();

  // Validate required fields
  if (!data.email || !data.password || !data.businessName || !data.username) {
    return {
      success: false,
      error: 'All required fields must be filled',
    };
  }

  // Validate username format (alphanumeric, underscores, hyphens)
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  if (!usernameRegex.test(data.username)) {
    return {
      success: false,
      error: 'Username must be 3-20 characters (letters, numbers, _ or - only)',
    };
  }

  try {
    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', data.username)
      .single();

    if (existingProfile) {
      return {
        success: false,
        error: 'Username is already taken',
      };
    }

    // Sign up the user (this works for invited users completing their signup)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          business_name: data.businessName,
          username: data.username,
          phone: data.phone || null,
        },
      },
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      return {
        success: false,
        error: signUpError.message || 'Failed to create account',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Account creation failed',
      };
    }

    // Create/update profile with extended data
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: data.email,
        business_name: data.businessName,
        username: data.username,
        phone: data.phone || null,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // User account created but profile failed - not ideal but not critical
    }

    return {
      success: true,
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('Unexpected error during signup:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string) {
  const supabase = await createSupabaseServerClient();

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return {
      available: false,
      error: 'Invalid username format',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned - username is available
      return { available: true };
    }

    if (data) {
      return { available: false, error: 'Username is taken' };
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking username:', error);
    return { available: false, error: 'Failed to check username' };
  }
}
