import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

// This route serves ONLY the three bundled PUBLIC STARTER documents.
// Never extend it to sensitive workspace docs without authentication and Crobi grants.
const ALLOWED = new Set(["overview", "engineering", "docs"]);
const FILES: Record<string, string> = {
  overview: "overview.md",
  engineering: "engineering-playbook.md",
  docs: "docs-contract.md",
};

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "overview";
  if (!ALLOWED.has(slug)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  try {
    const filepath = path.join(process.cwd(), "content", "docs", FILES[slug]);
    const content = await readFile(filepath, "utf8");
    return NextResponse.json({ slug, content }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Document unavailable" }, { status: 503 });
  }
}
