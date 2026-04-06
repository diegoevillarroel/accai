import { NextRequest, NextResponse } from "next/server";
import { getThreadReplies } from "@/lib/threads";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const replies = await getThreadReplies(id);
    return NextResponse.json(replies);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
