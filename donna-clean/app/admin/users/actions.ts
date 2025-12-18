'use server';

import { requireAdmin } from '@/lib/admin/check-admin';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * Sends an email invitation to a new user
 * Uses Supabase Auth Admin API with SERVICE ROLE key
 */
export async function inviteUser(email: string) {
  try {
    // Verify admin access
    await requireAdmin();

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Valid email address is required',
      };
    }

    // CRITICAL: Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://donna-clean.vercel.app';

    console.log('Inviting user with admin client:', email);

    // Send invitation using admin client
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/sign-up`,
      data: {
        invited_by: 'admin',
        invited_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Invitation error:', error);

      if (error.message.includes('already registered')) {
        return {
          success: false,
          error: 'This email is already registered.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to send invitation',
      };
    }

    // Revalidate admin pages
    revalidatePath('/admin/users/manage');
    revalidatePath('/admin/users/monitor');

    return {
      success: true,
      message: `Invitation sent to ${email}!`,
      data,
    };
  } catch (error) {
    console.error('Invitation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation',
    };
  }
}

/**
 * Generates a signup link for manual distribution
 * Fallback when email invitations are not working
 */
export async function generateSignupLink(email: string) {
  try {
    // Verify admin access
    await requireAdmin();

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Valid email address is required',
      };
    }

    // CRITICAL: Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://donna-clean.vercel.app';

    // Generate an invite link (doesn't require password)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/sign-up`,
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
      message: 'Signup link generated! Copy and send to user.',
      link: data.properties.action_link,
      email: email,
    };
  } catch (error) {
    console.error('Unexpected error during link generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate link',
    };
  }
}
