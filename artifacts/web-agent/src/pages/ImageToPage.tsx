import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  ImageIcon,
  Sparkles,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileCode2,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  responseMode: "generate" | "clarify";
  agentMessage?: string;
  clarificationQuestion?: string;
  quickReplies?: string[];
  sessionId?: string;
  imageUploadId?: string;
  projectSlug?: string;
  downloadUrl?: string;
  pageType?: string;
  colorScheme?: string;
  confidence?: number;
  detectedElements?: string[];
  description?: string;
  title?: string;
  fileCount?: number;
  files?: string[];
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-400 bg-green-400/10 border-green-400/30" :
    score >= 60 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" :
                  "text-red-400 bg-red-400/10 border-red-400/30";
  const label = score >= 80 ? "High confidence" : score >= 60 ? "Medium confidence" : "Low confidence";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${color}`}>
      {score}% — {label}
    </span>
  );
}

// ─── Detected elements list ───────────────────────────────────────────────────

function ElementsList({ elements }: { elements: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? elements : elements.slice(0, 5);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((el, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
            {el}
          </span>
        ))}
      </div>
      {elements.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Show less" : `+${elements.length - 5} more elements`}
        </button>
      )}
    </div>
  );
}

// ─── File list ────────────────────────────────────────────────────────────────

function FileList({ files }: { files: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileCode2 className="w-4 h-4" />
        {files.length} files generated
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1 pl-6 border-l border-border/50">
          {files.map((f, i) => (
            <li key={i} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <FileCode2 className="w-3 h-3 text-primary/60" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImageToPage() {
  const [dragOver, setDragOver] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarifyPageType, setClarifyPageType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image selection ─────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP, or GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError(null);
    setResult(null);
    setClarifyPageType(null);
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setClarifyPageType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── API call ────────────────────────────────────────────────────────────────
  const analyze = async (pageTypeOverride?: string) => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setLoadingStep("Uploading image...");
      const formData = new FormData();
      formData.append("image", image);
      if (description.trim()) formData.append("description", description.trim());
      if (result?.sessionId) formData.append("sessionId", result.sessionId);
      if (pageTypeOverride) formData.append("pageType", pageTypeOverride);

      setLoadingStep("Analyzing layout with AI vision...");
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/agent/image-to-page`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `Request failed: ${res.status}`);
      }

      setLoadingStep("Generating structured code...");
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleQuickReply = (reply: string) => {
    // Map quick reply label → page type slug
    const pageTypeMap: Record<string, string> = {
      "Login page": "login",
      "Dashboard": "dashboard",
      "Landing page": "index",
      "Register page": "register",
      "Admin panel": "admin",
      "Contact form": "form",
    };
    const pt = pageTypeMap[reply];
    if (pt) {
      setClarifyPageType(pt);
      analyze(pt);
    } else {
      // Non-pageType quick reply (e.g. "Make it darker") — re-submit with description
      setDescription((prev) => (prev ? `${prev}, ${reply}` : reply));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            Image → Webpage
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Upload a UI design, screenshot, or mockup. The AI will analyze the layout and generate a complete, production-ready multi-file webpage.
          </p>
        </div>

        {/* Drop zone */}
        {!imagePreview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={onFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary/20" : "bg-muted"}`}>
                <Upload className={`w-7 h-7 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  {dragOver ? "Drop it here!" : "Drag & drop your image"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or <span className="text-primary underline underline-offset-2">browse files</span> — PNG, JPG, WebP, GIF up to 10 MB
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["UI Screenshot", "Figma Export", "Wireframe", "Design Mockup"].map((label) => (
                  <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Image preview card */
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Uploaded design"
                className="w-full max-h-96 object-contain bg-muted/30"
              />
              <button
                onClick={clearImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center gap-3 bg-muted/20 border-t border-border">
              <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{image?.name}</span>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                {image ? (image.size / 1024).toFixed(0) + " KB" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Optional description */}
        {imagePreview && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Additional context <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. 'dark SaaS dashboard with sidebar and charts' or 'login form, minimal style'"
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none transition-colors"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Generate button */}
        {imagePreview && !loading && !(result?.responseMode === "generate") && (
          <button
            onClick={() => analyze()}
            disabled={!image || loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-5 h-5" />
            Analyze & Generate Webpage
          </button>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm font-medium text-foreground">Processing your image...</span>
            </div>
            <div className="space-y-2">
              {[
                "Uploading image...",
                "Analyzing layout with AI vision...",
                "Generating structured code...",
              ].map((step) => (
                <div key={step} className="flex items-center gap-3 text-sm">
                  {loadingStep === step ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
                  ) : loadingStep > step ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />
                  )}
                  <span className={loadingStep === step ? "text-foreground" : "text-muted-foreground"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clarification mode */}
        {result?.responseMode === "clarify" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Agent says:</p>
                <p className="text-sm text-foreground">{result.clarificationQuestion}</p>
                {result.confidence !== undefined && (
                  <div className="mt-2">
                    <ConfidenceBadge score={result.confidence} />
                  </div>
                )}
              </div>
            </div>

            {result.quickReplies && result.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-11">
                {result.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {result.detectedElements && result.detectedElements.length > 0 && (
              <div className="pl-11 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Detected elements</p>
                <ElementsList elements={result.detectedElements} />
              </div>
            )}
          </div>
        )}

        {/* Success result */}
        {result?.responseMode === "generate" && (
          <div className="space-y-4">
            {/* Success card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-green-500/5">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">Page Generated Successfully</span>
                {result.confidence !== undefined && (
                  <div className="ml-auto">
                    <ConfidenceBadge score={result.confidence} />
                  </div>
                )}
              </div>

              <div className="p-5 space-y-5">
                {/* Agent message */}
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {result.agentMessage}
                </p>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2">
                  {result.pageType && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      <Layers className="w-3 h-3" />
                      {result.pageType} page
                    </span>
                  )}
                  {result.colorScheme && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                      {result.colorScheme === "dark" ? "🌙" : "☀️"} {result.colorScheme} theme
                    </span>
                  )}
                  {result.title && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                      {result.title}
                    </span>
                  )}
                </div>

                {/* Detected elements */}
                {result.detectedElements && result.detectedElements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Detected elements</p>
                    <ElementsList elements={result.detectedElements} />
                  </div>
                )}

                {/* File list */}
                {result.files && result.files.length > 0 && (
                  <FileList files={result.files} />
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {result.downloadUrl && (
                    <a
                      href={`${import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}${result.downloadUrl}`}
                      download
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </a>
                  )}
                  <button
                    onClick={clearImage}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Another
                  </button>
                </div>
              </div>
            </div>

            {/* Quick reply chips for follow-up actions */}
            {result.quickReplies && result.quickReplies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">What's next?</p>
                <div className="flex flex-wrap gap-2">
                  {result.quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 rounded-full border border-border bg-muted/30 text-foreground text-xs font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        {!imagePreview && !loading && (
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              How it works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: "1",
                  title: "Upload your design",
                  desc: "Any UI screenshot, Figma export, wireframe, or mockup image",
                },
                {
                  step: "2",
                  title: "AI analyzes layout",
                  desc: "Vision AI detects sections, components, colors, and structure",
                },
                {
                  step: "3",
                  title: "Clean code generated",
                  desc: "Multi-file HTML, CSS layers, and JS — not a pixel-copy, a real rebuild",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
