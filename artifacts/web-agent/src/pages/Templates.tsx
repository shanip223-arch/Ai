import { useListTemplates, getListTemplatesQueryKey, useProcessCommand, getListOutputsQueryKey, getGetCommandHistoryQueryKey, getGetAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PAGE_TYPE_COLORS: Record<string, string> = {
  login: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dashboard: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  index: "bg-green-500/15 text-green-400 border-green-500/30",
  register: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  form: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function Templates() {
  const { data, isLoading } = useListTemplates({
    query: { queryKey: getListTemplatesQueryKey() },
  });
  const queryClient = useQueryClient();
  const processCommand = useProcessCommand();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const templates = data?.templates ?? [];

  const handleGenerate = (templateId: string, name: string) => {
    processCommand.mutate(
      { data: { command: `create a ${templateId} page with clean modern professional UI`, researchMode: false } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListOutputsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCommandHistoryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
          toast({
            title: "Page Generated",
            description: `${name} saved as ${result.outputFile}`,
          });
          if (result.outputFile) {
            navigate(`/preview?file=${result.outputFile}`);
          }
        },
        onError: () => {
          toast({ title: "Failed", description: "Could not generate page", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <LayoutTemplate className="w-7 h-7 text-primary" />
          Page Templates
        </h1>
        <p className="text-muted-foreground">
          Pre-built page templates. Click Generate to instantly create a production-ready version.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="h-5 w-28 bg-muted rounded animate-pulse mb-3" />
                <div className="h-4 w-full bg-muted/60 rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-muted/40 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const colorClass =
              PAGE_TYPE_COLORS[tpl.pageType] ??
              "bg-primary/15 text-primary border-primary/30";
            return (
              <Card
                key={tpl.id}
                className="bg-card border-border hover:border-primary/40 transition-all flex flex-col"
              >
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-base">{tpl.name}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize ml-2 shrink-0 ${colorClass}`}
                    >
                      {tpl.pageType}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-5">
                    {tpl.description}
                  </p>
                  <Button
                    className="w-full gap-2 mt-auto"
                    size="sm"
                    disabled={processCommand.isPending}
                    onClick={() => handleGenerate(tpl.id, tpl.name)}
                  >
                    <Zap className="w-4 h-4" />
                    {processCommand.isPending ? "Generating..." : "Generate Page"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
