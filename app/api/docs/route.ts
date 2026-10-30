import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DOCS = new Set(["overview", "engineering", "knowledge-contract"]);

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "overview";
  if (!DOCS.has(id)) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  try {
    const source = await readFile(join(process.cwd(), "content", "docs", id + ".md"), "utf8");
    return NextResponse.json({ id, source, demo: true });
  } catch {
    return NextResponse.json({ error: "Document unavailable" }, { status: 503 });
  }
}
