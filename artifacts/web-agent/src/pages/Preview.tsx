import { useState } from "react";
import { useLocation } from "wouter";
import { usePreviewOutput, getPreviewOutputQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download, Code, Monitor, Smartphone, RefreshCw } from "lucide-react";

function useSearchParam(key: string): string {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  return params.get(key) ?? "";
}

export default function Preview() {
  const fileParam = useSearchParam("file");
  const [inputFile, setInputFile] = useState(fileParam);
  const [activeFile, setActiveFile] = useState(fileParam);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  const { data, isLoading, isError } = usePreviewOutput(activeFile, {
    query: {
      queryKey: getPreviewOutputQueryKey(activeFile),
      enabled: !!activeFile,
    },
  });

  const handleLoad = () => {
    setActiveFile(inputFile.trim());
  };

  const handleDownload = () => {
    if (!data?.content) return;
    const blob = new Blob([data.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile || "output.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const iframeWidth = deviceMode === "mobile" ? "375px" : "100%";

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Eye className="w-7 h-7 text-primary" />
            Preview
          </h1>
          <p className="text-muted-foreground text-sm">
            Live preview of generated HTML pages.
          </p>
        </div>
      </div>

      {/* File Loader */}
      <div className="flex items-center gap-3 mb-5">
        <Input
          value={inputFile}
          onChange={(e) => setInputFile(e.target.value)}
          placeholder="filename.html"
          className="font-mono text-sm bg-background border-border"
        />
        <Button onClick={handleLoad} disabled={!inputFile.trim()} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" />
          Load
        </Button>
      </div>

      {/* Toolbar */}
      {data && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("preview")}
              className="gap-2"
            >
              <Monitor className="w-4 h-4" />
              Preview
            </Button>
            <Button
              variant={viewMode === "code" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("code")}
              className="gap-2"
            >
              <Code className="w-4 h-4" />
              Source
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={deviceMode === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDeviceMode("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceMode === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDeviceMode("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2 border-border ml-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Content Area */}
      {!activeFile && (
        <Card className="border-dashed border-border bg-card/50 flex-1">
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Eye className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Enter a filename above to preview it.</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="border-border bg-card flex-1">
          <CardContent className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5 flex-1">
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-destructive">File not found or failed to load.</p>
          </CardContent>
        </Card>
      )}

      {data && viewMode === "preview" && (
        <div
          className="flex-1 rounded-lg border border-border overflow-hidden bg-white transition-all mx-auto"
          style={{ width: iframeWidth, minHeight: "500px" }}
        >
          <iframe
            srcDoc={data.content}
            title="Preview"
            className="w-full h-full border-0"
            style={{ minHeight: "500px" }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {data && viewMode === "code" && (
        <div className="flex-1 rounded-lg border border-border overflow-hidden bg-[#050505]">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs font-mono text-muted-foreground">{activeFile}</span>
          </div>
          <pre className="p-5 text-xs font-mono text-green-400 overflow-auto" style={{ maxHeight: "70vh" }}>
            <code>{data.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
