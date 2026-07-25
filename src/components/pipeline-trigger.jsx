"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, IN_PROGRESS_STATUSES } from "@/components/status-badge";
import { ExternalLink, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 4000;

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function shortSha(sha) {
  return sha.slice(0, 8);
}

export function PipelineTrigger() {
  const [ref, setRef] = useState("main");
  const [isTriggering, setIsTriggering] = useState(false);
  const [pipeline, setPipeline] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function schedulePoll(pipelineId) {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(() => fetchStatus(pipelineId), POLL_INTERVAL_MS);
  }

  async function fetchStatus(pipelineId) {
    setIsPolling(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch pipeline status");
      setPipeline(data.pipeline);
      setJobs(data.jobs);
      if (IN_PROGRESS_STATUSES.has(data.pipeline.status)) {
        schedulePoll(pipelineId);
      } else {
        setIsPolling(false);
      }
    } catch (err) {
      setIsPolling(false);
      toast.error(err instanceof Error ? err.message : "Failed to fetch pipeline status");
    }
  }

  async function handleTrigger() {
    if (!ref.trim()) {
      toast.error("Enter a branch or tag name first");
      return;
    }
    setIsTriggering(true);
    setPipeline(null);
    setJobs([]);
    if (pollTimer.current) clearTimeout(pollTimer.current);

    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger pipeline");
      setPipeline(data);
      toast.success(`Pipeline #${data.id} triggered`);
      fetchStatus(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger pipeline");
    } finally {
      setIsTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trigger a Pipeline</CardTitle>
          <CardDescription>Runs a new pipeline for the given branch or tag on the configured GitLab project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs space-y-1.5">
              <Label htmlFor="ref">Branch or tag</Label>
              <Input
                id="ref"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="main"
                disabled={isTriggering}
                onKeyDown={(e) => e.key === "Enter" && handleTrigger()}
              />
            </div>
            <Button onClick={handleTrigger} disabled={isTriggering}>
              {isTriggering ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                "Trigger Pipeline"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {pipeline && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Pipeline #{pipeline.id}
                <StatusBadge status={pipeline.status} />
                {isPolling && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </CardTitle>
              <CardDescription>
                {pipeline.ref} @ {shortSha(pipeline.sha)}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={pipeline.web_url} target="_blank" rel="noopener noreferrer" />}
            >
              View in GitLab
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Source</p>
                <p className="font-medium capitalize">{pipeline.source.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">{new Date(pipeline.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium">{formatDuration(pipeline.duration)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Updated</p>
                <p className="font-medium">{new Date(pipeline.updated_at).toLocaleString()}</p>
              </div>
            </div>

            {jobs.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Jobs</p>
                  <div className="rounded-md border divide-y">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{job.name}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{job.stage}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-muted-foreground text-xs">{formatDuration(job.duration)}</span>
                          <StatusBadge status={job.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {jobs.length === 0 && IN_PROGRESS_STATUSES.has(pipeline.status) && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
