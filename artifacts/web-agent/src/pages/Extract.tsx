import { useState, useEffect, useRef } from "react";
import {
  useStartExtraction,
  useListExtractions,
  useGetExtraction,
  getListExtractionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ScanLine,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Package,
  FileCode2,
  Image,
  FileType,
  Braces,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  css: <FileCode2 className="w-3.5 h-3.5 text-blue-400" />,
  js: <Braces className="w-3.5 h-3.5 text-yellow-400" />,
  image: <Image className="w-3.5 h-3.5 text-green-400" />,
  font: <FileType className="w-3.5 h-3.5 text-purple-400" />,
  other: <Package className="w-3.5 h-3.5 text-muted-foreground" />,
};

const STATUS_BADGE: Record<string, string> = {
  running: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  success: "bg-green-500/15 text-green-400 border-green-500/30",
  partial: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

// Polls a single running job until it completes
function useJobPoller(jobId: string | null, onDone: () => void) {
  const { data, refetch } = useGetExtraction(jobId ?? "", {
    query: { enabled: false },
  });

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 2500));
        const result = await refetch();
        const status = result.data?.status;
        if (status && status !== "running") {
          onDone();
          break;
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [jobId]);

  return data;
}

export default function Extract() {
  const [url, setUrl] = useState("");
  const [waitForIdle, setWaitForIdle] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startMutation = useStartExtraction();

  const { data: listData, isLoading: listLoading } = useListExtractions({
    query: { queryKey: getListExtractionsQueryKey() },
  });

  const polledJob = useJobPoller(activeJobId, () => {
    queryClient.invalidateQueries({ queryKey: getListExtractionsQueryKey() });
    toast({ title: "Extraction complete", description: `Job ${activeJobId} finished.` });
    setActiveJobId(null);
  });

  const extractions = listData?.extractions ?? [];

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    startMutation.mutate(
      { data: { url: trimmed, waitForNetworkIdle: waitForIdle, executeJs: true } },
      {
        onSuccess: (job) => {
          setUrl("");
          setActiveJobId(job.jobId);
          queryClient.invalidateQueries({ queryKey: getListExtractionsQueryKey() });
          toast({
            title: "Extraction started",
            description: "Rendering page and collecting assets…",
          });
        },
        onError: () => {
          toast({ title: "Failed to start", description: "Check the URL and try again.", variant: "destructive" });
        },
      }
    );
  };

  const groupByType = (assets: NonNullable<typeof polledJob>["assets"]) => {
    const groups: Record<string, typeof assets> = { css: [], js: [], image: [], font: [], other: [] };
    assets.forEach((a) => { (groups[a.type] ?? groups.other).push(a); });
    return groups;
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <ScanLine className="w-7 h-7 text-primary" />
          Full Page Extract
        </h1>
        <p className="text-muted-foreground text-sm">
          Automated browser-inspect mode. Renders the full page, captures all assets (CSS, JS, images, fonts),
          rewrites paths, and produces a complete offline copy.
        </p>
      </div>

      {/* Input form */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="pl-9 font-mono text-sm bg-background border-border"
                  disabled={startMutation.isPending || !!activeJobId}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                disabled={!url.trim() || startMutation.isPending || !!activeJobId}
                className="gap-2 shrink-0"
              >
                {startMutation.isPending || activeJobId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ScanLine className="w-4 h-4" />
                )}
                {activeJobId ? "Extracting…" : "Extract Page"}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={waitForIdle}
                  onChange={(e) => setWaitForIdle(e.target.checked)}
                  disabled={!!activeJobId}
                  className="accent-primary w-4 h-4 rounded"
                />
                Wait for network idle (slower but more complete)
              </label>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Live running job card */}
      {activeJobId && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              <div>
                <p className="font-semibold text-primary text-sm">Extraction in progress</p>
                <p className="text-xs text-muted-foreground font-mono">{activeJobId}</p>
              </div>
            </div>
            {polledJob && (
              <div className="space-y-2 font-mono text-xs">
                <p className="text-muted-foreground">{polledJob.message}</p>
                {polledJob.stats.totalAssets > 0 && (
                  <div className="flex gap-4 text-muted-foreground">
                    <span className="text-green-400">{polledJob.stats.downloaded} downloaded</span>
                    {polledJob.stats.failed > 0 && (
                      <span className="text-destructive">{polledJob.stats.failed} failed</span>
                    )}
                    <span>/ {polledJob.stats.totalAssets} total</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past extractions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Past Extractions</h2>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => queryClient.invalidateQueries({ queryKey: getListExtractionsQueryKey() })}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {listLoading && (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="h-4 w-64 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-40 bg-muted/60 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!listLoading && extractions.length === 0 && (
          <Card className="border-dashed border-border bg-card/40">
            <CardContent className="p-12 text-center">
              <ScanLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No extractions yet. Paste a URL above to start.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {extractions.map((job) => {
            const isExpanded = expandedJob === job.jobId;
            const groups = groupByType(job.assets);
            const totalSize = job.assets.reduce((s, a) => s + a.sizeBytes, 0);

            return (
              <Card
                key={job.jobId}
                className={`border-border transition-all ${job.status === "running" ? "border-primary/30 bg-primary/5" : "bg-card hover:border-primary/30"}`}
              >
                <CardContent className="p-5">
                  {/* Job header */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {job.status === "running" ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : job.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : job.status === "partial" ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-semibold truncate max-w-xs">
                          {job.url}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize ${STATUS_BADGE[job.status]}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{job.message}</p>

                      {/* Stats row */}
                      {job.status !== "running" && job.assets.length > 0 && (
                        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {job.stats.downloaded}/{job.stats.totalAssets} assets
                          </span>
                          {job.stats.htmlSize > 0 && (
                            <span className="flex items-center gap-1">
                              <FileCode2 className="w-3 h-3" />
                              HTML: {formatBytes(job.stats.htmlSize)}
                            </span>
                          )}
                          <span>{formatBytes(totalSize)} total</span>
                          <span>{formatDate(job.timestamp)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {job.previewPath && (
                        <a
                          href={job.previewPath}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="gap-1.5 border-border hover:border-primary/60 hover:text-primary text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </Button>
                        </a>
                      )}
                      {job.assets.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground text-xs"
                          onClick={() => setExpandedJob(isExpanded ? null : job.jobId)}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {job.assets.length} files
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Asset breakdown */}
                  {isExpanded && job.assets.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {Object.entries(groups).map(([type, assets]) => {
                          if (assets.length === 0) return null;
                          const dlCount = assets.filter((a) => a.downloaded).length;
                          return (
                            <div key={type} className="bg-background rounded-lg p-3 border border-border">
                              <div className="flex items-center gap-2 mb-1">
                                {TYPE_ICON[type]}
                                <span className="text-xs font-semibold capitalize">{type}</span>
                              </div>
                              <p className="text-lg font-bold">{assets.length}</p>
                              <p className="text-xs text-muted-foreground">{dlCount} downloaded</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Asset list */}
                      <div className="bg-background rounded-lg border border-border overflow-hidden">
                        <div className="px-4 py-2 border-b border-border bg-muted/10">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset List</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {job.assets.map((asset, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0 hover:bg-muted/10"
                            >
                              <span className="shrink-0">{TYPE_ICON[asset.type]}</span>
                              <span
                                className="text-xs font-mono text-muted-foreground truncate flex-1"
                                title={asset.originalUrl}
                              >
                                {asset.localPath}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground shrink-0">
                                {formatBytes(asset.sizeBytes)}
                              </span>
                              {asset.downloaded ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-destructive/60 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
