import { NextResponse } from "next/server";
import { triggerPipeline } from "@/lib/gitlab";

export async function POST(request) {
  let ref;
  try {
    ({ ref } = await request.json());
  } catch {
    return NextResponse.json({ error: "Request body must be JSON with a `ref` field" }, { status: 400 });
  }

  if (typeof ref !== "string" || ref.trim() === "") {
    return NextResponse.json({ error: "`ref` (branch or tag name) is required" }, { status: 400 });
  }

  try {
    const pipeline = await triggerPipeline(ref.trim());
    return NextResponse.json(pipeline, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to trigger pipeline";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
