import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ valid: false, error: "INSTAGRAM_ACCESS_TOKEN not set" });

  try {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
    const resp = await fetch(url);
    const debug = await resp.json();

    const tokenData = debug.data;
    if (!tokenData?.is_valid) return NextResponse.json({ valid: false, error: "Token is invalid" });

    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null;
    const daysRemaining = tokenData.expires_at ? Math.floor((tokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return NextResponse.json({ valid: true, expiresAt, daysRemaining, scopes: tokenData.scopes || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
