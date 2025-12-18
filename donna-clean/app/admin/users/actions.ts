'use server';

import { requireAdmin } from '@/lib/admin/check-admin';
import { createSupabaseServerClient } from '@/utils/supabase/server';

/**
 * Sends an email invitation to a new user
 * Uses Supabase Auth Admin API to invite user by email
 */
export async function inviteUser(email: string) {
  // Verify admin access
  await requireAdmin();

  // Validate email
  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Valid email address is required',
    };
  }

  const supabase = await createSupabaseServerClient();

  // Get site URL for redirect
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // Invite user via Supabase Auth Admin API
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/signup?invited=true`,
      data: {
        invited_by: 'admin',
        invited_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Invitation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send invitation',
      };
    }

    return {
      success: true,
      message: `Invitation sent to ${email}`,
      user: data.user,
    };
  } catch (error) {
    console.error('Unexpected error during invitation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Generates a signup link for manual distribution
 * Fallback when email invitations are not working
 */
export async function generateSignupLink(email: string) {
  // Verify admin access
  await requireAdmin();

  // Validate email
  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Valid email address is required',
    };
  }

  const supabase = await createSupabaseServerClient();

  // Get site URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // Generate a magic link (this creates the user but doesn't send email)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth/signup?invited=true`,
        data: {
          invited_by: 'admin',
          invited_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      console.error('Link generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate signup link',
      };
    }

    // Return the generated link for manual distribution
    return {
      success: true,
      message: 'Signup link generated successfully',
      link: data.properties?.action_link || null,
      email: email,
    };
  } catch (error) {
    console.error('Unexpected error during link generation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
