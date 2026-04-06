import { NextResponse } from "next/server";
import { getAccountProfile, getInstagramEnvError } from "@/lib/instagram";

export async function GET() {
  const envErr = getInstagramEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }
  try {
    const profile = await getAccountProfile();
    return NextResponse.json(profile);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
