import { NextRequest, NextResponse } from "next/server";
import { write } from "@/lib/neo4j";

/**
 * Keep-alive endpoint, hit daily by the Vercel cron in vercel.json.
 *
 * Neo4j Aura Free pauses instances after a period without activity and later
 * deletes paused instances permanently. This route performs one tiny write so
 * the instance always registers recent activity (a write counts under every
 * definition of "activity" Neo4j uses). It also doubles as a health check.
 *
 * The write touches a single `Keepalive` node that nothing else in the app
 * reads. Snapshot export skips that label.
 *
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token on cron runs).
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const rows = await write<{ pings: string; songs: string }>(
      `MERGE (k:Keepalive {id: 'vercel-cron'})
       SET k.lastPingAt = datetime(), k.pings = coalesce(k.pings, 0) + 1
       WITH k
       CALL { MATCH (s:Song) RETURN count(s) AS songCount }
       RETURN toString(k.pings) AS pings, toString(songCount) AS songs`,
    );
    return NextResponse.json({
      ok: true,
      pings: Number(rows[0]?.pings ?? "0"),
      songs: Number(rows[0]?.songs ?? "0"),
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[keepalive] Neo4j write failed:", message);
    return NextResponse.json(
      { ok: false, error: message, checkedAt: new Date().toISOString() },
      { status: 500 },
    );
  }
}
