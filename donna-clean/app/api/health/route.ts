import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    // Check database connection
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("entries").select("count").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "unhealthy", error: "Database connection failed" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "ok",
        api: "ok",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "System error" },
      { status: 503 }
    );
  }
}
