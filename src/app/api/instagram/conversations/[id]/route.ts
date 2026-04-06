import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/instagram";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await getMessages(id);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
