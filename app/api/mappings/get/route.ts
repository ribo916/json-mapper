import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const file = url.searchParams.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "Missing ?file=name parameter" },
        { status: 400 }
      );
    }

    const fullPath = path.join(process.cwd(), "mappings", `${file}.json`);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: `Mapping file not found: ${file}` },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(fullPath, "utf8");
    return NextResponse.json({ file, content: JSON.parse(raw) });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load mapping", details: err.message },
      { status: 500 }
    );
  }
}
