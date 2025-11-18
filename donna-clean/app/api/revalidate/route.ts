import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/utils/supabase/server";

type RevalidatePayload = {
  paths?: string[];
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RevalidatePayload;
    const pathList = Array.isArray(body.paths) ? body.paths : [];
    const uniquePaths = [...new Set(pathList)].filter((path): path is string => typeof path === "string");

    uniquePaths.forEach((path) => {
      if (path.startsWith("/")) {
        revalidatePath(path);
      }
    });

    return NextResponse.json({ revalidated: uniquePaths });
  } catch (error) {
    console.error("Failed to revalidate paths", error);
    return NextResponse.json({ error: "Unable to revalidate" }, { status: 500 });
  }
}
