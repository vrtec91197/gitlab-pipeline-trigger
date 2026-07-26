// In-memory fake GitLab backend for local dev/testing without real
// credentials. Enabled via GITLAB_MOCK=true. Each triggered pipeline
// progresses through a fixed set of jobs over time, purely based on
// elapsed wall-clock time since trigger — no timers, so it works
// correctly across the app's poll-based GET requests.

const JOB_DEFS = [
  { name: "install", stage: "build" },
  { name: "build", stage: "build" },
  { name: "unit-tests", stage: "test" },
  { name: "lint", stage: "test" },
  { name: "deploy", stage: "deploy" },
];
const JOB_DURATION_MS = 3000;
const TOTAL_DURATION_MS = JOB_DEFS.length * JOB_DURATION_MS;

const pipelines = new Map();
let nextId = 1000;

function randomSha() {
  const chars = "0123456789abcdef";
  return Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function computeJobs(pipeline) {
  const elapsed = Date.now() - pipeline.startTime;
  return JOB_DEFS.map((def, i) => {
    const jobStart = i * JOB_DURATION_MS;
    const jobEnd = jobStart + JOB_DURATION_MS;
    let status = "created";
    let duration = null;
    if (elapsed >= jobEnd) {
      status = pipeline.willFail && i === JOB_DEFS.length - 1 ? "failed" : "success";
      duration = JOB_DURATION_MS / 1000;
    } else if (elapsed >= jobStart) {
      status = "running";
      duration = (elapsed - jobStart) / 1000;
    }
    return { id: pipeline.id * 100 + i, name: def.name, stage: def.stage, status, duration };
  });
}

function computeStatus(pipeline, jobs) {
  const elapsed = Date.now() - pipeline.startTime;
  if (elapsed < 400) return { status: "pending", done: false };
  if (elapsed < TOTAL_DURATION_MS) return { status: "running", done: false };
  return { status: jobs.some((j) => j.status === "failed") ? "failed" : "success", done: true };
}

function toSummary(pipeline) {
  const jobs = computeJobs(pipeline);
  const { status, done } = computeStatus(pipeline, jobs);
  return {
    id: pipeline.id,
    ref: pipeline.ref,
    sha: pipeline.sha,
    source: pipeline.source,
    web_url: pipeline.web_url,
    status,
    created_at: pipeline.created_at,
    updated_at: new Date().toISOString(),
    duration: done ? TOTAL_DURATION_MS / 1000 : null,
  };
}

export async function mockTriggerPipeline(ref) {
  const id = nextId++;
  const sha = randomSha();
  const now = new Date().toISOString();
  const pipeline = {
    id,
    ref,
    sha,
    source: "trigger",
    web_url: `https://gitlab.com/mock/project/-/pipelines/${id}`,
    created_at: now,
    startTime: Date.now(),
    // ~1 in 6 mock runs ends in failure, so the UI's failed state gets exercised too.
    willFail: Math.random() < (1 / 6),
  };
  pipelines.set(id, pipeline);

  // ~1 in 3 triggers also spins up a sibling pipeline for the same commit,
  // simulating a compliance framework / security policy pipeline — so the
  // "show every pipeline for this trigger" UI path gets exercised too.
  if (Math.random() < (1 / 3)) {
    const complianceId = nextId++;
    pipelines.set(complianceId, {
      id: complianceId,
      ref,
      sha,
      source: "security_orchestration_policy",
      web_url: `https://gitlab.com/mock/project/-/pipelines/${complianceId}`,
      created_at: now,
      startTime: Date.now() + 200, // starts a beat after the main one
      willFail: false,
    });
  }

  return toSummary(pipeline);
}

export async function mockGetPipeline(id) {
  const pipeline = pipelines.get(id);
  if (!pipeline) throw new Error(`Mock pipeline ${id} not found — the dev server may have restarted`);
  return toSummary(pipeline);
}

export async function mockGetPipelineJobs(id) {
  const pipeline = pipelines.get(id);
  if (!pipeline) throw new Error(`Mock pipeline ${id} not found — the dev server may have restarted`);
  return computeJobs(pipeline);
}

export async function mockListPipelinesForSha(sha) {
  return [...pipelines.values()].filter((p) => p.sha === sha).map(toSummary);
}
