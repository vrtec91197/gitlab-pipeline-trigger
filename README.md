# GitLab Pipeline Trigger

A small Next.js app to trigger a GitLab CI pipeline and watch its status
(and job list) update live, built with shadcn/ui.

## Setup

1. Copy the env template and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

   - `GITLAB_TOKEN` — a personal or project access token with the `api` scope.
   - `GITLAB_PROJECT_ID` — the target project's numeric ID or URL-encoded path.
   - `GITLAB_BASE_URL` — only needed for self-hosted GitLab (defaults to `https://gitlab.com`).

   No real GitLab project handy? Set `GITLAB_MOCK=true` instead — every
   request is served from an in-memory fake pipeline that progresses
   through jobs (build → test → deploy) over about 15 seconds, occasionally
   ending in a failure, so the full UI can be exercised with no credentials.

2. Install dependencies and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000), enter a branch or tag, and click **Trigger Pipeline**.

## How it works

- `POST /api/pipelines` — triggers a new pipeline for the given `ref` via
  `POST /projects/:id/pipeline` on the GitLab API.
- `GET /api/pipelines/:id` — fetches the pipeline's current status plus its
  jobs, used by the frontend to poll every 4s while the pipeline is still
  running.
- `src/lib/gitlab.js` — the GitLab API client. All requests are made
  server-side (route handlers), so `GITLAB_TOKEN` is never exposed to the
  browser.

## Stack

Next.js (App Router) · JavaScript · Tailwind CSS · shadcn/ui
