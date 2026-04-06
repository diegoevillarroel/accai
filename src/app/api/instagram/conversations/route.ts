import { NextResponse } from "next/server";
import { getConversations } from "@/lib/instagram";

export async function GET() {
  try {
    const data = await getConversations();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
