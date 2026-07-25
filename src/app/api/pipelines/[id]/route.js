import { NextResponse } from "next/server";
import { getPipeline, getPipelineJobs } from "@/lib/gitlab";

export async function GET(_request, { params }) {
  const { id } = await params;
  const pipelineId = Number(id);
  if (!Number.isInteger(pipelineId)) {
    return NextResponse.json({ error: "Invalid pipeline id" }, { status: 400 });
  }

  try {
    const [pipeline, jobs] = await Promise.all([
      getPipeline(pipelineId),
      getPipelineJobs(pipelineId),
    ]);
    return NextResponse.json({ pipeline, jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch pipeline";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
