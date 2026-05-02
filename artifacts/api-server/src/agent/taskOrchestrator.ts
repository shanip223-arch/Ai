import { normalizeCommand } from "./languageNormalizer.js";
import { detectMode } from "./modeDetector.js";
import { buildConditions } from "./conditionEngine.js";
import { getRules } from "./projectRuleEngine.js";
import { generatePage } from "./templateGenerator.js";
import { analyzeUrl } from "./urlAnalyzer.js";
import { performResearch } from "./researchMode.js";
import { saveOutput, generateFilename } from "./outputSystem.js";
import { logger } from "../lib/logger.js";

export interface TaskStep {
  step: number;
  name: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  detail: string | null;
}

export interface OrchestrationResult {
  jobId: string;
  status: "success" | "error";
  normalizedCommand: string;
  detectedIntent: string;
  detectedMode: string;
  detectedUrl: string | null;
  tasks: TaskStep[];
  outputFile: string | null;
  message: string;
}

let commandsProcessed = 0;
export function getCommandsProcessed(): number {
  return commandsProcessed;
}

const commandHistory: {
  id: string;
  command: string;
  normalizedCommand: string;
  intent: string;
  mode: string;
  outputFile: string | null;
  status: string;
  timestamp: string;
}[] = [];

export function getCommandHistory() {
  return [...commandHistory].reverse().slice(0, 50);
}

function makeJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeStep(step: number, name: string): TaskStep {
  return { step, name, status: "pending", detail: null };
}

export async function orchestrate(
  rawCommand: string,
  researchEnabled: boolean
): Promise<OrchestrationResult> {
  const jobId = makeJobId();
  commandsProcessed++;

  const tasks: TaskStep[] = [
    makeStep(1, "Normalize command"),
    makeStep(2, "Detect mode"),
    makeStep(3, "Build conditions"),
    makeStep(4, "Apply project rules"),
    makeStep(5, "Analyze URL"),
    makeStep(6, "Research best practices"),
    makeStep(7, "Generate UI"),
    makeStep(8, "Save output"),
  ];

  const setStep = (i: number, status: TaskStep["status"], detail?: string) => {
    tasks[i - 1].status = status;
    if (detail !== undefined) tasks[i - 1].detail = detail;
  };

  try {
    setStep(1, "running");
    const normalized = normalizeCommand(rawCommand);
    setStep(1, "done", normalized.normalized);

    setStep(2, "running");
    const mode = detectMode(normalized, researchEnabled);
    setStep(2, "done", `Mode: ${mode}`);

    setStep(3, "running");
    const conditions = buildConditions(normalized);
    setStep(3, "done", `Page: ${conditions.pageType}, Style: ${conditions.uiStyle.join(", ")}`);

    setStep(4, "running");
    const rules = getRules(conditions.colorScheme);
    setStep(4, "done", `Color scheme: ${conditions.colorScheme}, Spacing: 8px scale`);

    let urlAnalysis = null;
    if (mode === "analyze" && normalized.url) {
      setStep(5, "running", `Analyzing ${normalized.url}`);
      try {
        urlAnalysis = await analyzeUrl(normalized.url);
        setStep(5, "done", `Found: ${urlAnalysis.hasNavbar ? "navbar " : ""}${urlAnalysis.hasForms ? "forms " : ""}${urlAnalysis.hasCards ? "cards" : ""}`);
      } catch (err) {
        setStep(5, "error", "URL analysis failed, proceeding with defaults");
        logger.error({ err }, "URL analysis error");
      }
    } else {
      setStep(5, "skipped", "No URL provided");
    }

    let research = null;
    if (mode === "research" || researchEnabled) {
      setStep(6, "running");
      research = await performResearch(rawCommand, conditions.pageType, researchEnabled);
      setStep(6, "done", `Found ${research.bestPractices.length} best practices`);
    } else {
      setStep(6, "skipped", "Research mode off");
    }

    setStep(7, "running");
    const html = generatePage(conditions, rules, urlAnalysis);
    setStep(7, "done", `Generated ${conditions.pageType} page (${html.length} bytes)`);

    setStep(8, "running");
    const filename = generateFilename(conditions.pageType);
    saveOutput(filename, html);
    setStep(8, "done", `Saved as ${filename}`);

    const result: OrchestrationResult = {
      jobId,
      status: "success",
      normalizedCommand: normalized.normalized,
      detectedIntent: normalized.intent,
      detectedMode: mode,
      detectedUrl: normalized.url,
      tasks,
      outputFile: filename,
      message: `Successfully generated ${conditions.pageType} page as ${filename}`,
    };

    commandHistory.push({
      id: jobId,
      command: rawCommand,
      normalizedCommand: normalized.normalized,
      intent: normalized.intent,
      mode,
      outputFile: filename,
      status: "success",
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    logger.error({ err, jobId }, "Orchestration failed");
    const errMsg = err instanceof Error ? err.message : String(err);
    tasks.forEach((t) => { if (t.status === "running") { t.status = "error"; t.detail = errMsg; } });

    commandHistory.push({
      id: jobId,
      command: rawCommand,
      normalizedCommand: rawCommand,
      intent: "unknown",
      mode: "direct",
      outputFile: null,
      status: "error",
      timestamp: new Date().toISOString(),
    });

    return {
      jobId,
      status: "error",
      normalizedCommand: rawCommand,
      detectedIntent: "unknown",
      detectedMode: "direct",
      detectedUrl: null,
      tasks,
      outputFile: null,
      message: `Agent error: ${errMsg}`,
    };
  }
}
