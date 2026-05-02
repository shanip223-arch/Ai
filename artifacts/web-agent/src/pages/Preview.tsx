import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { usePreviewOutput, getPreviewOutputQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download, Code, Monitor, Smartphone, RefreshCw, AlertCircle } from "lucide-react";

export default function Preview() {
  const search = useSearch();
  const fileFromUrl = new URLSearchParams(search).get("file") ?? "";

  const [inputFile, setInputFile] = useState(fileFromUrl);
  const [activeFile, setActiveFile] = useState(fileFromUrl);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  // Keep in sync whenever the URL ?file= param changes (e.g. navigating from Outputs)
  useEffect(() => {
    if (fileFromUrl && fileFromUrl !== activeFile) {
      setInputFile(fileFromUrl);
      setActiveFile(fileFromUrl);
      setViewMode("preview");
    }
  }, [fileFromUrl]);

  const { data, isLoading, isError } = usePreviewOutput(activeFile, {
    query: {
      queryKey: getPreviewOutputQueryKey(activeFile),
      enabled: !!activeFile,
    },
  });

  const handleLoad = () => {
    const trimmed = inputFile.trim();
    if (trimmed) setActiveFile(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLoad();
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

  const iframeWidth = deviceMode === "mobile" ? "390px" : "100%";

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <Eye className="w-7 h-7 text-primary" />
          Preview
        </h1>
        <p className="text-muted-foreground text-sm">
          Live preview of generated HTML pages — rendered exactly as they will appear in the browser.
        </p>
      </div>

      {/* File Loader */}
      <div className="flex items-center gap-2">
        <Input
          value={inputFile}
          onChange={(e) => setInputFile(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. login-1746200000000.html"
          className="font-mono text-sm bg-background border-border flex-1"
        />
        <Button
          onClick={handleLoad}
          disabled={!inputFile.trim() || isLoading}
          className="gap-2 shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Load
        </Button>
      </div>

      {/* Toolbar — only shown when file is loaded */}
      {data && (
        <div className="flex items-center justify-between">
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
            {viewMode === "preview" && (
              <>
                <Button
                  variant={deviceMode === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  title="Desktop view"
                  onClick={() => setDeviceMode("desktop")}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={deviceMode === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  title="Mobile view"
                  onClick={() => setDeviceMode("mobile")}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2 border-border ml-1"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!activeFile && !isLoading && (
        <Card className="border-dashed border-border bg-card/50 flex-1">
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <Eye className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm text-center">
              Enter a filename above, or open a file from the{" "}
              <a href="/outputs" className="text-primary underline-offset-4 hover:underline">
                Outputs
              </a>{" "}
              page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="border-border bg-card flex-1">
          <CardContent className="flex items-center justify-center h-64 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground text-sm font-mono">Loading {activeFile}…</span>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card className="border-destructive/40 bg-destructive/5 flex-1">
          <CardContent className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-destructive font-medium">File not found</p>
            <p className="text-muted-foreground text-sm font-mono">{activeFile}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview iframe — renders the real generated HTML */}
      {data && !isLoading && viewMode === "preview" && (
        <div
          className="flex-1 rounded-lg border border-border overflow-hidden transition-all duration-300"
          style={{
            width: iframeWidth,
            minHeight: "520px",
            margin: deviceMode === "mobile" ? "0 auto" : undefined,
          }}
        >
          <iframe
            key={`${activeFile}-${deviceMode}`}
            srcDoc={data.content}
            title={`Preview: ${activeFile}`}
            className="w-full border-0"
            style={{ height: "100%", minHeight: "520px", display: "block" }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}

      {/* Source code view */}
      {data && !isLoading && viewMode === "code" && (
        <div className="flex-1 rounded-lg border border-border overflow-hidden bg-[#050508]">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs font-mono text-muted-foreground">{activeFile}</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {data.content.length.toLocaleString()} chars
            </span>
          </div>
          <pre
            className="p-5 text-xs font-mono text-green-400/90 overflow-auto"
            style={{ maxHeight: "68vh" }}
          >
            <code>{data.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
