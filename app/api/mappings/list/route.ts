import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const folder = path.join(process.cwd(), "mappings");

    if (!fs.existsSync(folder)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs
      .readdirSync(folder)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));

    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to list mappings", details: err.message },
      { status: 500 }
    );
  }
}
