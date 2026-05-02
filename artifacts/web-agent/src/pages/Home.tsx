import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { 
  useProcessCommand, 
  getListOutputsQueryKey, 
  getGetCommandHistoryQueryKey, 
  getGetAgentStatusQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Terminal, Send, Search, CheckCircle2, CircleDashed, Loader2, FileCode2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [command, setCommand] = useState("");
  const [researchMode, setResearchMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const processCommandMutation = useProcessCommand();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Ref to automatically scroll to bottom of tasks
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [processCommandMutation.data?.tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    processCommandMutation.mutate(
      { data: { command, researchMode } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOutputsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCommandHistoryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
          setCommand("");
        },
        onError: (err) => {
          toast({
            title: "Command Failed",
            description: err.error?.error || "An unknown error occurred",
            variant: "destructive"
          });
        }
      }
    );
  };

  const isExecuting = processCommandMutation.isPending;
  const result = processCommandMutation.data;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Console</h1>
        <p className="text-muted-foreground">Type a command to generate or modify web interfaces.</p>
      </div>

      <Card className="bg-card border-border shadow-lg mb-6 shrink-0">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="research-mode" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Search className="w-4 h-4" />
                Internet Research Mode
              </Label>
              <Switch 
                id="research-mode" 
                checked={researchMode} 
                onCheckedChange={setResearchMode}
                disabled={isExecuting}
              />
            </div>
            
            <div className="relative flex items-center">
              <div className="absolute left-4 text-primary animate-pulse">
                <Terminal className="w-5 h-5" />
              </div>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="is url ka ui bana do... or create a dashboard with clean UI"
                className="pl-12 pr-16 h-14 text-lg bg-background border-input focus-visible:ring-primary font-mono shadow-inner"
                disabled={isExecuting}
                autoComplete="off"
                spellCheck="false"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!command.trim() || isExecuting}
                className="absolute right-2 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
              >
                {isExecuting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(isExecuting || result) && (
        <Card className="flex-1 bg-[#050505] border-border overflow-hidden flex flex-col shadow-xl">
          <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
              </div>
              <span className="ml-2">execution_log.sh</span>
            </div>
            {result?.jobId && (
              <span className="text-xs font-mono text-muted-foreground">Job ID: {result.jobId}</span>
            )}
          </div>
          
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4 font-mono text-sm">
              {result?.normalizedCommand && (
                <div className="text-primary/80 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  $ normalize_command "{result.normalizedCommand}"
                </div>
              )}
              
              {result?.detectedMode && (
                <div className="text-primary/60 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  $ set_mode --{result.detectedMode} --intent="{result.detectedIntent}"
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                {result?.tasks.map((task, index) => (
                  <div 
                    key={task.step} 
                    className="flex items-start gap-3 animate-fade-in-up"
                    style={{ animationDelay: `${0.3 + (index * 0.1)}s` }}
                  >
                    <div className="mt-0.5">
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : task.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : task.status === 'error' ? (
                        <CircleDashed className="w-4 h-4 text-destructive" />
                      ) : (
                        <CircleDashed className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold ${task.status === 'running' ? 'text-primary' : 'text-foreground'}`}>
                        [{task.step}] {task.name}
                      </div>
                      {task.detail && (
                        <div className="text-muted-foreground text-xs mt-1">
                          {task.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result?.status === 'success' && result.outputFile && (
                <div className="mt-8 p-4 border border-primary/20 bg-primary/5 rounded-md animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                  <div className="flex items-center gap-2 text-primary font-bold mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Task Completed Successfully
                  </div>
                  <p className="text-muted-foreground mb-4">{result.message}</p>
                  <Link href={`/preview?file=${result.outputFile}`}>
                    <Button variant="outline" className="w-full sm:w-auto border-primary/50 hover:bg-primary/10 hover:text-primary gap-2">
                      <FileCode2 className="w-4 h-4" />
                      Open {result.outputFile}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
