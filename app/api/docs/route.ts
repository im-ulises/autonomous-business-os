import { NextRequest, NextResponse } from "next/server";
import { publicSampleDocs } from "../../../lib/public-sample-docs";

// Public starter documents only. No private workspace data is exposed.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "overview";
  if (!Object.prototype.hasOwnProperty.call(publicSampleDocs, slug)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ slug, content: publicSampleDocs[slug] }, {
    headers: { "Cache-Control": "public, max-age=120" },
  });
}
