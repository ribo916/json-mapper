import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { executeMapping } from "@/lib/engine"; // adjust path if needed

function loadMapping(mapName: string) {
  const mappingPath = path.join(process.cwd(), "mappings", `${mapName}.json`);
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mapName}`);
  }
  const raw = fs.readFileSync(mappingPath, "utf8");
  return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mapName = url.searchParams.get("map");
    if (!mapName) {
      return Response.json({ error: "Missing ?map=name parameter" }, { status: 400 });
    }

    const body = await req.json();
    const mappingFile = loadMapping(mapName);

    // 🔥 use the SAME engine as the old project
    const result = executeMapping(mappingFile, body);

    return new Response(
      JSON.stringify(
        { mappingUsed: mapName, result },
        null,
        2 // pretty-print 2 spaces
      ),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err: any) {
    return Response.json(
      { error: "Conversion failed", details: err.message },
      { status: 500 }
    );
  }
}
