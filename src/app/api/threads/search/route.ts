import { NextRequest, NextResponse } from "next/server";
import { searchThreads } from "@/lib/threads";

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  try {
    const results = await searchThreads(query);
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
