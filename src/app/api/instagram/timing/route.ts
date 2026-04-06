import { NextResponse } from "next/server";
import { getInstagramEnvError, getOnlineFollowers } from "@/lib/instagram";

export async function GET() {
  const envErr = getInstagramEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr, hourly: [], recommendedWindows: [] }, { status: 503 });
  }
  try {
    const data = await getOnlineFollowers();
    const hourlyData = data?.data?.[0]?.values || [];

    const byHour: Record<number, number[]> = {};
    for (const entry of hourlyData) {
      if (typeof entry.value === 'object' && entry.value !== null) {
        for (const [h, count] of Object.entries(entry.value as Record<string, number>)) {
          const hour = parseInt(h);
          if (!byHour[hour]) byHour[hour] = [];
          byHour[hour].push(count as number);
        }
      } else {
        const hour = new Date(entry.end_time).getUTCHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push(entry.value ?? 0);
      }
    }

    const avgByHour = Object.entries(byHour).map(([hour, vals]) => ({
      hour: parseInt(hour),
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
    })).sort((a, b) => b.avg - a.avg);

    const topWindows = avgByHour.slice(0, 3).map(h => ({
      hour: h.hour,
      label: `${h.hour.toString().padStart(2, '0')}:00 — ${(h.hour + 1).toString().padStart(2, '0')}:00`,
      avgOnline: Math.round(h.avg),
    }));

    return NextResponse.json({ hourly: avgByHour, recommendedWindows: topWindows, raw: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: message, hourly: [], recommendedWindows: [] },
      { status: 502 }
    );
  }
}
