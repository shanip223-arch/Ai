import { Link } from "wouter";
import { useGetCommandHistory, getGetCommandHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History as HistoryIcon, RefreshCw, CheckCircle2, XCircle, Eye, Clock, ArrowRight } from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const MODE_COLORS: Record<string, string> = {
  analyze: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  research: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  direct: "bg-green-500/15 text-green-400 border-green-500/30",
};

export default function History() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetCommandHistory({
    query: { queryKey: getGetCommandHistoryQueryKey() },
  });

  const history = data?.history ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-primary" />
            Command History
          </h1>
          <p className="text-muted-foreground">
            All commands processed by the agent, newest first.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: getGetCommandHistoryQueryKey() })
          }
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-3" />
                <div className="h-3 w-1/2 bg-muted/60 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Failed to load history.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && history.length === 0 && (
        <Card className="border-dashed border-border bg-card/50">
          <CardContent className="p-16 text-center">
            <HistoryIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No commands yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Run commands from the Agent Console and they will appear here.
            </p>
            <Link href="/">
              <Button className="gap-2">Go to Console</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && history.length > 0 && (
        <div className="space-y-3">
          {history.map((item) => {
            const modeClass =
              MODE_COLORS[item.mode] ?? "bg-muted/20 text-muted-foreground border-border";
            return (
              <Card
                key={item.id}
                className="bg-card border-border hover:border-primary/30 transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {item.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className="font-mono text-sm font-semibold truncate text-foreground">
                          {item.command}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 font-mono ml-6">
                        <ArrowRight className="w-3 h-3 inline mr-1 text-primary/60" />
                        {item.normalizedCommand}
                      </p>
                      <div className="flex items-center gap-2 ml-6 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize ${modeClass}`}
                        >
                          {item.mode}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded bg-muted/30 border border-border">
                          {item.intent}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    {item.outputFile && (
                      <Link href={`/preview?file=${item.outputFile}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border hover:border-primary/60 hover:text-primary shrink-0 mt-1"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
