// Thin client around the GitLab REST API (v4). Mirrors the auth convention
// already used in ../gitlab_client/gitlab_client.py — a PRIVATE-TOKEN header
// with a personal/project access token (`api` scope), read from env vars so
// nothing sensitive lives in source.
//
// Set GITLAB_MOCK=true to route every call through an in-memory fake
// instead — lets the UI be exercised end-to-end with no real GitLab
// project or token. See ./gitlab-mock.js.

import { mockTriggerPipeline, mockGetPipeline, mockGetPipelineJobs } from "./gitlab-mock";

const GITLAB_BASE_URL = (process.env.GITLAB_BASE_URL || "https://gitlab.com").replace(/\/$/, "");
const USE_MOCK = process.env.GITLAB_MOCK === "true";

function config() {
  const token = process.env.GITLAB_TOKEN;
  const projectId = process.env.GITLAB_PROJECT_ID;
  if (!token) throw new Error("GITLAB_TOKEN is not configured on the server");
  if (!projectId) throw new Error("GITLAB_PROJECT_ID is not configured on the server");
  return { token, projectId };
}

async function gitlabFetch(path, init) {
  const { token, projectId } = config();
  const url = `${GITLAB_BASE_URL}/api/v4/projects/${encodeURIComponent(projectId)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "PRIVATE-TOKEN": token, ...(init?.headers || {}) },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.message ? `: ${JSON.stringify(body.message)}` : "";
    } catch {
      // response wasn't JSON — ignore, we'll just report the status
    }
    throw new Error(`GitLab API error ${res.status} ${res.statusText}${detail}`);
  }

  return res.json();
}

/** Triggers a new pipeline run for the given ref (branch or tag name). */
export function triggerPipeline(ref) {
  if (USE_MOCK) return mockTriggerPipeline(ref);
  return gitlabFetch(`/pipeline?ref=${encodeURIComponent(ref)}`, {
    method: "POST",
  });
}

export function getPipeline(pipelineId) {
  if (USE_MOCK) return mockGetPipeline(pipelineId);
  return gitlabFetch(`/pipelines/${pipelineId}`);
}

export function getPipelineJobs(pipelineId) {
  if (USE_MOCK) return mockGetPipelineJobs(pipelineId);
  return gitlabFetch(`/pipelines/${pipelineId}/jobs?per_page=100`);
}
