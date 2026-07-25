import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// GitLab pipeline/job statuses mapped to a small fixed status palette —
// green=good, red=critical, blue=in-progress, amber=needs-attention,
// gray=neutral/inactive. Colors are reserved for status only, never reused
// for anything else in this UI.
const STATUS_STYLES = {
  success: "bg-green-500 text-white border-transparent",
  failed: "bg-red-500 text-white border-transparent",
  running: "bg-blue-500 text-white border-transparent",
  pending: "bg-amber-400 text-amber-950 border-transparent",
  created: "bg-muted text-muted-foreground",
  waiting_for_resource: "bg-amber-400 text-amber-950 border-transparent",
  preparing: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-400 text-amber-950 border-transparent",
  canceled: "bg-muted text-muted-foreground line-through",
  skipped: "bg-muted text-muted-foreground",
  manual: "bg-amber-400 text-amber-950 border-transparent",
};

export function StatusBadge({ status }) {
  return (
    <Badge className={cn("capitalize font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export const IN_PROGRESS_STATUSES = new Set([
  "created",
  "waiting_for_resource",
  "preparing",
  "pending",
  "running",
  "scheduled",
]);
