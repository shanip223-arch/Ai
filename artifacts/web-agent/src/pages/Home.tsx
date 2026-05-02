import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useProcessCommand, getListOutputsQueryKey, getGetCommandHistoryQueryKey, getGetAgentStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Send, RefreshCw, Bot, User, Download, Eye,
  CheckCircle2, CircleDashed, Loader2, ChevronDown, ChevronUp,
  Search, Sparkles, RotateCcw, Globe, ShieldCheck, ExternalLink,
  Trash2, Plus, MessageSquareX, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentResponseMode = "generate" | "clarify" | "acknowledge";

interface TaskStep {
  step: number;
  name: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  detail: string | null;
}

interface WebSourceItem {
  url: string;
  domain: string;
  title: string;
  relevanceScore: number;
  qualityScore: number;
  headings?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  responseMode?: AgentResponseMode;
  quickReplies?: string[];
  outputFile?: string | null;
  projectSlug?: string | null;
  downloadUrl?: string | null;
  tasks?: TaskStep[];
  validationScore?: number | null;
  confidenceScore?: number | null;
  regenerated?: boolean;
  acknowledgment?: string | null;
  // Web research
  webResearchUsed?: boolean;
  webSources?: WebSourceItem[];
  webCrossCheckedFacts?: string[];
  webAdaptedPatterns?: string[];
  // Chat management
  turnId?: string | null;         // server-side session turn ID
  chatOperation?: string | null;  // chat management operation type
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const SESSION_KEY  = "agent_os_session_id";
const MESSAGES_KEY = "agent_os_messages";

function loadMessages(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(MESSAGES_KEY) ?? "[]"); }
  catch { return []; }
}

function persistMessages(msgs: ChatMessage[]) {
  try { localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-80))); }
  catch { /* quota */ }
}

// ── Score badge ───────────────────────────────────────────────────────────────

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    score >= 60 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                  "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${color}`}>
      {label}: {score}/100
    </span>
  );
}

// ── Web Sources Panel ─────────────────────────────────────────────────────────

function QualityDot({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-400" : score >= 80 ? "bg-yellow-400" : "bg-orange-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0 mt-1.5`} />;
}

function WebSourcesPanel({
  sources,
  crossCheckedFacts,
  adaptedPatterns,
}: {
  sources: WebSourceItem[];
  crossCheckedFacts: string[];
  adaptedPatterns: string[];
}) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-500/8 transition-colors"
      >
        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-xs font-medium text-blue-300 flex-1 text-left">
          {sources.length} web source{sources.length !== 1 ? "s" : ""} consulted
          {crossCheckedFacts.length > 0 && ` · ${crossCheckedFacts.length} cross-checked`}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-blue-400/60" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400/60" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-blue-500/15">
          <div className="pt-2 space-y-2">
            {sources.map((src, i) => (
              <div key={i} className="flex items-start gap-2">
                <QualityDot score={src.qualityScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-300 hover:text-blue-200 truncate max-w-[200px] flex items-center gap-1 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {src.title.slice(0, 45)}{src.title.length > 45 ? "…" : ""}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                    </a>
                    <span className="text-xs text-blue-400/50 font-mono shrink-0">{src.domain}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300/80 font-mono shrink-0">
                      {src.relevanceScore}% relevant
                    </span>
                  </div>
                  {src.headings && src.headings.length > 0 && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                      {src.headings.slice(0, 2).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {crossCheckedFacts.length > 0 && (
            <div className="pt-1 border-t border-blue-500/10">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Cross-verified facts</span>
              </div>
              <ul className="space-y-1">
                {crossCheckedFacts.slice(0, 4).map((fact, i) => (
                  <li key={i} className="text-xs text-muted-foreground/70 flex items-start gap-1.5">
                    <span className="text-emerald-400/60 mt-0.5">✓</span>
                    <span className="capitalize">{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {adaptedPatterns.length > 0 && (
            <div className="pt-1 border-t border-blue-500/10">
              <p className="text-xs font-medium text-blue-300/70 mb-1.5">Applied patterns (adapted, not copied)</p>
              <ul className="space-y-1">
                {adaptedPatterns.slice(0, 4).map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground/60 flex items-start gap-1.5">
                    <span className="text-blue-400/50 mt-0.5 shrink-0">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task step list ─────────────────────────────────────────────────────────────

function TaskList({ tasks }: { tasks: TaskStep[] }) {
  const [open, setOpen] = useState(false);
  const relevant = tasks.filter((t) => t.status !== "skipped" && t.status !== "pending");
  if (relevant.length === 0) return null;
  return (
    <div className="mt-3 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/8 text-xs text-muted-foreground font-medium transition-colors"
      >
        <span>View execution log ({relevant.length} steps)</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="p-3 space-y-2.5 bg-black/30 font-mono text-xs">
          {relevant.map((t) => (
            <div key={t.step} className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                {t.status === "done"    && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {t.status === "running" && <Loader2      className="w-3.5 h-3.5 text-primary animate-spin" />}
                {t.status === "error"   && <CircleDashed className="w-3.5 h-3.5 text-destructive" />}
                {t.status === "skipped" && <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/40" />}
              </div>
              <div>
                <span className={t.status === "done" ? "text-foreground/80" : t.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                  [{t.step.toString().padStart(2, "0")}] {t.name}
                </span>
                {t.detail && (
                  <div className="text-muted-foreground/60 mt-0.5 leading-snug">{t.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 border border-primary/30">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5 py-1">
          <span className="text-xs text-muted-foreground mr-1.5">Thinking</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick reply chips ─────────────────────────────────────────────────────────

function QuickReplies({ replies, onSelect }: { replies: string[]; onSelect: (r: string) => void }) {
  if (!replies || replies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {replies.map((r) => (
        <button
          key={r}
          onClick={() => onSelect(r)}
          className="text-xs px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-all font-medium"
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── Chat operation badge ──────────────────────────────────────────────────────

function ChatOpBadge({ op }: { op: string }) {
  const labels: Record<string, { icon: string; label: string; color: string }> = {
    reset_chat:     { icon: "🧹", label: "Chat Reset",      color: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    delete_last:    { icon: "🗑️", label: "Last Message Deleted", color: "border-red-500/30 bg-red-500/10 text-red-300" },
    delete_message: { icon: "🗑️", label: "Message Deleted", color: "border-red-500/30 bg-red-500/10 text-red-300" },
    new_session:    { icon: "🚀", label: "New Session",     color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  };
  const info = labels[op] ?? { icon: "✓", label: op, color: "border-border bg-muted/20 text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${info.color} mb-2`}>
      <span>{info.icon}</span>
      {info.label}
    </span>
  );
}

// ── Per-message delete button ─────────────────────────────────────────────────

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      title="Remove from view"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/15 text-muted-foreground/50 hover:text-destructive shrink-0"
      aria-label="Delete message"
    >
      <X className="w-3 h-3" />
    </button>
  );
}

// ── Agent message bubble ──────────────────────────────────────────────────────

function AgentBubble({
  msg,
  onQuickReply,
  onDelete,
}: {
  msg: ChatMessage;
  onQuickReply: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const isClarify = msg.responseMode === "clarify";
  const isChatOp  = !!msg.chatOperation;

  return (
    <div className="flex items-start gap-3 max-w-[88%] group">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5 border border-primary/30">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Acknowledgment prefix */}
        {msg.acknowledgment && (
          <p className="text-xs text-primary/80 mb-1 font-medium italic">{msg.acknowledgment}</p>
        )}

        {/* Chat operation badge */}
        {isChatOp && msg.chatOperation && (
          <div><ChatOpBadge op={msg.chatOperation} /></div>
        )}

        <div className={`bg-card border rounded-2xl rounded-tl-sm px-4 py-3 ${
          isClarify ? "border-primary/30 bg-primary/5" :
          isChatOp  ? "border-orange-500/20 bg-orange-500/5" :
          "border-border"
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

          {/* Task steps (collapsible) */}
          {msg.tasks && msg.tasks.length > 0 && (
            <TaskList tasks={msg.tasks} />
          )}

          {/* Web sources panel */}
          {msg.webResearchUsed && msg.webSources && msg.webSources.length > 0 && (
            <WebSourcesPanel
              sources={msg.webSources}
              crossCheckedFacts={msg.webCrossCheckedFacts ?? []}
              adaptedPatterns={msg.webAdaptedPatterns ?? []}
            />
          )}

          {/* Quality scores */}
          {(msg.validationScore != null || msg.confidenceScore != null) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {msg.validationScore != null && <ScoreBadge label="HTML" score={msg.validationScore} />}
              {msg.confidenceScore != null && <ScoreBadge label="Confidence" score={msg.confidenceScore} />}
              {msg.regenerated && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-orange-500/15 text-orange-400 border-orange-500/30">
                  Auto-improved
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {msg.outputFile && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href={`/preview?file=${msg.outputFile}`}>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border hover:border-primary/60 hover:text-primary">
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </Button>
              </Link>
              {msg.downloadUrl && (
                <a href={msg.downloadUrl} download>
                  <Button size="sm" className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90">
                    <Download className="w-3.5 h-3.5" />
                    Download Project
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Quick replies */}
        {msg.quickReplies && msg.quickReplies.length > 0 && (
          <QuickReplies replies={msg.quickReplies} onSelect={onQuickReply} />
        )}

        <div className="flex items-center gap-2 mt-1 ml-1">
          <p className="text-xs text-muted-foreground/50">{formatTime(msg.timestamp)}</p>
          <DeleteButton onDelete={() => onDelete(msg.id)} />
        </div>
      </div>
    </div>
  );
}

// ── User message bubble ───────────────────────────────────────────────────────

function UserBubble({ msg, onDelete }: { msg: ChatMessage; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 justify-end max-w-[88%] ml-auto group">
      <div className="flex-1 flex flex-col items-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-full">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 mr-1">
          <DeleteButton onDelete={() => onDelete(msg.id)} />
          <p className="text-xs text-muted-foreground/50">{formatTime(msg.timestamp)}</p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border">
        <User className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Session info bar ──────────────────────────────────────────────────────────

function SessionInfoBar({
  sessionId,
  messageCount,
  onDeleteLast,
  onResetChat,
  onNewSession,
}: {
  sessionId: string | null;
  messageCount: number;
  onDeleteLast: () => void;
  onResetChat: () => void;
  onNewSession: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!sessionId) return null;

  const shortId = sessionId.slice(-8);

  return (
    <div className="mb-3 shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors group"
      >
        <span className="font-mono text-xs">
          Session <span className="text-primary/60">{shortId}</span>
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span>{messageCount} message{messageCount !== 1 ? "s" : ""}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => { onDeleteLast(); setOpen(false); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:border-red-500/40 hover:text-red-400 transition-all text-muted-foreground"
          >
            <Trash2 className="w-3 h-3" />
            Delete last
          </button>
          <button
            onClick={() => { onResetChat(); setOpen(false); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:border-orange-500/40 hover:text-orange-400 transition-all text-muted-foreground"
          >
            <MessageSquareX className="w-3 h-3" />
            Reset chat
          </button>
          <button
            onClick={() => { onNewSession(); setOpen(false); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:border-emerald-500/40 hover:text-emerald-400 transition-all text-muted-foreground"
          >
            <Plus className="w-3 h-3" />
            New session
          </button>
          <span className="text-xs text-muted-foreground/30 self-center">
            or type "reset chat", "delete last message", "new session"
          </span>
        </div>
      )}
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    "Login page with dark theme and validation",
    "Admin dashboard with sidebar and stats",
    "Landing page for a SaaS startup",
    "Contact form with email validation",
    "User registration with password strength",
  ];
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">AGENT_OS</h2>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Describe the web UI you need — in English, Hinglish, or mix of both. I'll ask a few questions, then generate a complete multi-file project ready to download.
        </p>
        <div className="grid gap-2 text-left">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="w-full text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages]       = useState<ChatMessage[]>(() => loadMessages());
  const [input, setInput]             = useState("");
  const [sessionId, setSessionId]     = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [researchMode, setResearchMode] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const processCmd  = useProcessCommand();
  const isThinking  = processCmd.isPending;

  // Persist messages whenever they change
  useEffect(() => { persistMessages(messages); }, [messages]);

  // Auto-scroll on new messages or thinking state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Remove a message from both frontend and backend session memory
  const deleteMessage = useCallback((msgId: string) => {
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === msgId);
      // If message has a server-side turnId, sync deletion with backend
      if (msg?.turnId && sessionId) {
        fetch(`/api/agent/session/${sessionId}/messages/${msg.turnId}`, {
          method: "DELETE",
        }).catch(() => { /* best-effort, UI already updated */ });
      }
      return prev.filter((m) => m.id !== msgId);
    });
  }, [sessionId]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setInput("");

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    processCmd.mutate(
      { data: { command: trimmed, researchMode, sessionId } },
      {
        onSuccess: (data) => {
          const newSessionId = data.sessionId ?? sessionId;
          if (data.sessionId) {
            setSessionId(data.sessionId);
            localStorage.setItem(SESSION_KEY, data.sessionId);
          }

          const agentMsg: ChatMessage = {
            id: makeId(),
            role: "agent",
            content: (data as any).agentMessage || data.message,
            timestamp: new Date().toISOString(),
            responseMode: ((data as any).responseMode as AgentResponseMode) ?? "generate",
            quickReplies: ((data as any).quickReplies as string[]) ?? [],
            outputFile: data.outputFile ?? null,
            projectSlug: data.projectSlug ?? null,
            downloadUrl: data.downloadUrl ?? null,
            tasks: ((data as any).tasks as TaskStep[]) ?? [],
            validationScore: data.validationReport?.score ?? null,
            confidenceScore: data.confidenceResult?.overall ?? null,
            regenerated: (data as any).regenerated ?? false,
            acknowledgment: (data as any).acknowledgment ?? null,
            webResearchUsed: (data as any).webResearchUsed ?? false,
            webSources: (data as any).webSources ?? [],
            webCrossCheckedFacts: (data as any).webCrossCheckedFacts ?? [],
            webAdaptedPatterns: (data as any).webAdaptedPatterns ?? [],
            turnId: (data as any).agentTurnId ?? null,
            chatOperation: (data as any).chatOperation ?? null,
          };

          const chatOp = (data as any).chatOperation as string | null | undefined;

          // ── Chat management: update visual state based on operation ───────
          if (chatOp === "reset_chat") {
            // Wipe ALL messages — only show the reset acknowledgment
            setMessages([agentMsg]);

          } else if (chatOp === "new_session") {
            // Fresh session — clear history and start new
            localStorage.removeItem(MESSAGES_KEY);
            setMessages([agentMsg]);

          } else if (chatOp === "delete_last") {
            // Remove the previous user+agent exchange before the delete command
            setMessages((prev) => {
              // prev currently ends with userMsg ("delete last message")
              // We want to remove the exchange BEFORE it
              if (prev.length < 3) {
                return [...prev, agentMsg];
              }
              // Find the last agent message before the current user command
              const deleteUserIdx = prev.length - 1;
              let lastAgentIdx = -1;
              let lastUserBeforeAgent = -1;

              for (let i = deleteUserIdx - 1; i >= 0; i--) {
                if (prev[i].role === "agent" && lastAgentIdx === -1) {
                  lastAgentIdx = i;
                } else if (prev[i].role === "user" && lastAgentIdx !== -1) {
                  lastUserBeforeAgent = i;
                  break;
                }
              }

              const toRemove = new Set<number>();
              if (lastAgentIdx !== -1) toRemove.add(lastAgentIdx);
              if (lastUserBeforeAgent !== -1) toRemove.add(lastUserBeforeAgent);

              const filtered = prev.filter((_, i) => !toRemove.has(i));
              return [...filtered, agentMsg];
            });

          } else {
            // Normal message — just append
            addMessage(agentMsg);
          }

          queryClient.invalidateQueries({ queryKey: getListOutputsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCommandHistoryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
        },
        onError: (err) => {
          const errMsg: ChatMessage = {
            id: makeId(),
            role: "agent",
            content: `Something went wrong: ${err.error?.error ?? "Unknown error"}. Please try again.`,
            timestamp: new Date().toISOString(),
            responseMode: "generate",
            quickReplies: [],
          };
          addMessage(errMsg);
        },
      }
    );
  }, [isThinking, researchMode, sessionId, processCmd, addMessage, queryClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  // Direct "Delete last" — calls backend, then removes last exchange from UI
  const handleDeleteLast = useCallback(() => {
    if (!sessionId) return;
    fetch("/api/agent/delete-last", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => { /* best-effort */ });

    // Remove the last user+agent pair from the frontend
    setMessages((prev) => {
      let copy = [...prev];
      // Pop trailing agent turn
      if (copy.length > 0 && copy[copy.length - 1].role === "agent") copy.pop();
      // Pop trailing user turn
      if (copy.length > 0 && copy[copy.length - 1].role === "user") copy.pop();
      return copy;
    });
  }, [sessionId]);

  // Direct "Reset chat" — clears backend context + history but KEEPS the session ID
  const handleResetChat = useCallback(() => {
    if (!sessionId) return;
    fetch("/api/agent/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => { /* best-effort */ });
    setMessages([]);
    localStorage.removeItem(MESSAGES_KEY);
  }, [sessionId]);

  // Direct "New session" — resets backend + issues a brand-new session ID
  const handleNewSession = useCallback(() => {
    if (sessionId) {
      fetch("/api/agent/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => { /* best-effort */ });
    }
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    inputRef.current?.focus();
  }, [sessionId]);

  // Full reset: clears backend session memory + frontend state
  const handleNewConversation = useCallback(() => {
    if (sessionId) {
      // Tell backend to wipe all turns, task, and context for this session
      fetch("/api/agent/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => { /* best-effort */ });
    }
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    inputRef.current?.focus();
  }, [sessionId]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agent Console</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Describe your project — I'll ask questions, then build it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New chat
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="research-mode" className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Search className="w-3.5 h-3.5" />
              Research
            </Label>
            <Switch
              id="research-mode"
              checked={researchMode}
              onCheckedChange={setResearchMode}
              disabled={isThinking}
            />
          </div>
        </div>
      </div>

      {/* Session info bar — only shown when there are messages */}
      {hasMessages && (
        <SessionInfoBar
          sessionId={sessionId}
          messageCount={messages.length}
          onDeleteLast={handleDeleteLast}
          onResetChat={handleResetChat}
          onNewSession={handleNewSession}
        />
      )}

      {/* Message area */}
      <div className="flex-1 overflow-y-auto mb-4 min-h-0">
        {!hasMessages ? (
          <WelcomeScreen onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }} />
        ) : (
          <div className="space-y-6 pb-2">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <UserBubble key={msg.id} msg={msg} onDelete={deleteMessage} />
              ) : (
                <AgentBubble key={msg.id} msg={msg} onQuickReply={handleQuickReply} onDelete={deleteMessage} />
              )
            )}
            {isThinking && <ThinkingBubble />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg focus-within:border-primary/50 transition-colors">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Login page banao… or type 'reset chat', 'delete last message'…"
              disabled={isThinking}
              rows={1}
              className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/50 min-h-[40px] max-h-[160px] py-2.5 px-2 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isThinking}
              className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-40"
            >
              {isThinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground/40 mt-2">
            Enter to send · Shift+Enter for new line · Type "reset chat" or "delete last message" to manage history
          </p>
        </form>
      </div>
    </div>
  );
}
