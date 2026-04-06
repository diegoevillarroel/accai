import { NextRequest, NextResponse } from "next/server";
import { publishThread } from "@/lib/threads";

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  try {
    const result = await publishThread(text);
    return NextResponse.json({ success: !!result.id, threadId: result.id, permalink: result.permalink });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
