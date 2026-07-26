import { NextResponse } from "next/server";
import { triggerPipeline, listPipelinesForSha } from "@/lib/gitlab";

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

    // A compliance framework or security policy can spin up sibling
    // pipelines for the same commit alongside the one just triggered —
    // rather than guessing which single one is "the real one", surface all
    // of them and let the UI show each with its own live status.
    let pipelines;
    try {
      pipelines = await listPipelinesForSha(pipeline.sha);
    } catch {
      pipelines = []; // best-effort — don't let this break the trigger flow
    }
    if (!pipelines.some((p) => p.id === pipeline.id)) pipelines.push(pipeline);

    return NextResponse.json({ pipelines }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to trigger pipeline";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
