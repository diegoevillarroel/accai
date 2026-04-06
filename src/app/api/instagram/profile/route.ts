import { NextResponse } from "next/server";
import { getAccountProfile } from "@/lib/instagram";

export async function GET() {
  try {
    const profile = await getAccountProfile();
    return NextResponse.json(profile);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
