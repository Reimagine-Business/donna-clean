import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getOrRefreshUser } from '@/lib/supabase/get-user';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get user
    const { user, initialError: authError } = await getOrRefreshUser(supabase);

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        authError: authError?.message,
        details: 'User not logged in or session expired'
      }, { status: 401 });
    }

    // Fetch entries with count
    const { data, error, count } = await supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    // Return detailed response
    return NextResponse.json({
      success: !error,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      entries_count: count,
      entries_sample: data?.slice(0, 3),
      error: error?.message,
      raw_error: error,
      query_details: {
        table: 'entries',
        filter: `user_id=eq.${user.id}`,
        select: '*',
        order: 'entry_date desc'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Unknown error',
      stack: err?.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
