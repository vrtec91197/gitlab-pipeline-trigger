// Thin client around the GitLab REST API (v4).
//
// Triggering a pipeline and reading its status use two different, unrelated
// credentials in GitLab:
//   - POST /projects/:id/trigger/pipeline authenticates via a `token` form
//     field — a project-scoped Pipeline Trigger Token (Settings > CI/CD >
//     Pipeline trigger tokens). It cannot read anything back, only kick off
//     a run, and does NOT use the PRIVATE-TOKEN header.
//   - GET /projects/:id/pipelines/:id (and its /jobs) still needs a real
//     personal/project access token (`read_api` or `api` scope) via the
//     PRIVATE-TOKEN header, same convention as ../gitlab_client/gitlab_client.py —
//     trigger tokens can't be used to read pipeline/job status.
//
// Set GITLAB_MOCK=true to route every call through an in-memory fake
// instead — lets the UI be exercised end-to-end with no real GitLab
// project or tokens. See ./gitlab-mock.js.

import { mockTriggerPipeline, mockGetPipeline, mockGetPipelineJobs } from "./gitlab-mock";

const GITLAB_BASE_URL = (process.env.GITLAB_BASE_URL || "https://gitlab.com").replace(/\/$/, "");
const USE_MOCK = process.env.GITLAB_MOCK === "true";

function projectId() {
  const projectId = process.env.GITLAB_PROJECT_ID;
  if (!projectId) throw new Error("GITLAB_PROJECT_ID is not configured on the server");
  return projectId;
}

function projectUrl(path) {
  return `${GITLAB_BASE_URL}/api/v4/projects/${encodeURIComponent(projectId())}${path}`;
}

async function parseErrorDetail(res) {
  try {
    const body = await res.json();
    return body.message ? `: ${JSON.stringify(body.message)}` : "";
  } catch {
    return ""; // response wasn't JSON — ignore, we'll just report the status
  }
}

async function gitlabFetch(path, init) {
  const token = process.env.GITLAB_TOKEN;
  if (!token) throw new Error("GITLAB_TOKEN is not configured on the server");

  const res = await fetch(projectUrl(path), {
    ...init,
    headers: { "PRIVATE-TOKEN": token, ...(init?.headers || {}) },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GitLab API error ${res.status} ${res.statusText}${await parseErrorDetail(res)}`);
  }

  return res.json();
}

/** Triggers a new pipeline run for the given ref (branch or tag name) using
 *  a Pipeline Trigger Token — see the module comment above for why this is
 *  a separate credential/request shape from the read endpoints below. */
export async function triggerPipeline(ref) {
  if (USE_MOCK) return mockTriggerPipeline(ref);

  const triggerToken = process.env.GITLAB_TRIGGER_TOKEN;
  if (!triggerToken) throw new Error("GITLAB_TRIGGER_TOKEN is not configured on the server");

  // multipart/form-data, matching `curl -F token=... -F ref=...` — don't set
  // Content-Type manually, fetch fills in the multipart boundary itself.
  const form = new FormData();
  form.append("token", triggerToken);
  form.append("ref", ref);

  const res = await fetch(projectUrl("/trigger/pipeline"), {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GitLab API error ${res.status} ${res.statusText}${await parseErrorDetail(res)}`);
  }

  return res.json();
}

export function getPipeline(pipelineId) {
  if (USE_MOCK) return mockGetPipeline(pipelineId);
  return gitlabFetch(`/pipelines/${pipelineId}`);
}

export function getPipelineJobs(pipelineId) {
  if (USE_MOCK) return mockGetPipelineJobs(pipelineId);
  return gitlabFetch(`/pipelines/${pipelineId}/jobs?per_page=100`);
}
