import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/data/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  const suggestions = await getSuggestions(q);
  return NextResponse.json(suggestions);
}
