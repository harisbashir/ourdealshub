import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { runDailyJob } from "@/lib/daily-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  const bearer = header.slice(7).trim();
  if (!bearer) return false;

  try {
    const a = Buffer.from(bearer);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Compatibility endpoint. Managed hosting runs the CLI job outside HTTP. */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDailyJob());
}
