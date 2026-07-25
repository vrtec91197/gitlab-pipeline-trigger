import { PipelineTrigger } from "@/components/pipeline-trigger";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">GitLab Pipeline Trigger</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trigger a pipeline run and watch its status update live.
        </p>
      </div>
      <PipelineTrigger />
    </main>
  );
}
