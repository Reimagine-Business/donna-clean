import { createServerClient } from "@supabase/ssr";
import { headers } from "next/headers";

export async function createSupabaseServerClient() {
  // In Next.js 16, use headers() to access cookies
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          // Parse cookie header manually
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key) acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
          return cookies[name];
        },
      },
    }
  );
}
