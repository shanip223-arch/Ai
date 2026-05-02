import { normalizeCommand } from "./languageNormalizer.js";
import { detectMode } from "./modeDetector.js";
import { buildConditions } from "./conditionEngine.js";
import { analyzeProjectRequirements, formatFileTree, type FileDecisionPlan } from "./projectIntelligenceEngine.js";
import { generateBackendProject } from "./backendTemplateEngine.js";
import { getRules } from "./projectRuleEngine.js";
import { generatePage } from "./templateGenerator.js";
import { generateStructuredProject } from "./projectTemplateEngine.js";
import { analyzeUrl } from "./urlAnalyzer.js";
import { performMultiSourceResearch, type MultiSourceReport } from "./multiSourceResearch.js";
import { performWebResearch, type WebResearchReport, type WebSource } from "./webSourceEngine.js";
import { saveOutput, generateFilename, saveProjectMeta } from "./outputSystem.js";
import { validateOutput, autoFixHtml, type ValidationReport } from "./validationEngine.js";
import { scoreConfidence, type ConfidenceResult } from "./confidenceScorer.js";
import {
  getOrCreateSession,
  createSession,
  detectConversationIntent,
  mergeConditionsFromInput,
  recordUserTurn,
  recordAgentTurn,
  transitionState,
  buildAgentSummary,
  serializeSession,
  resetSession,
  deleteLastTurn,
  deleteTurnById,
  type ConversationSession,
} from "./conversationMemory.js";
import {
  detectChatCommand,
  getChatCommandMessage,
  getChatCommandQuickReplies,
  type DetectedChatCommand,
} from "./chatCommandDetector.js";
import {
  assessAndPlan,
  getPostGenerationReplies,
  renderCompletionMessage,
  renderErrorMessage,
} from "./conversationalLayer.js";
import { packageProject } from "./projectPackager.js";
import { scanSecurity, type SecurityReport } from "./securityScanner.js";
import { optimizePerformance, type PerformanceReport } from "./performanceOptimizer.js";
import { recordVersion } from "./versionControl.js";
import { recordGeneration, getGenerationHints } from "./learningSystem.js";
import { detectEditIntent, applyEdit } from "./editEngine.js";
import { generateDependencyManifest } from "./dependencyManager.js";
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
  projectSlug: string | null;
  downloadUrl: string | null;
  message: string;
  validationReport: ValidationReport | null;
  confidenceResult: ConfidenceResult | null;
  regenerated: boolean;
  // Conversation fields
  sessionId: string;
  conversationIntent: "continue" | "new_task" | "explicit_reset" | "follow_up";
  agentMessage: string;
  followUpQuestions: string[];
  session: ReturnType<typeof serializeSession>;
  // Conversational behavior layer
  responseMode: "generate" | "clarify" | "acknowledge";
  clarificationQuestion: string | null;
  quickReplies: string[];
  acknowledgment: string | null;
  // Web research
  webResearchUsed: boolean;
  webSources: WebSource[];
  webCrossCheckedFacts: string[];
  webAdaptedPatterns: string[];
  // Project intelligence
  projectType: string;
  techStackSummary: string;
  fileTreeText: string;
  // Chat management
  chatOperation: string | null;
  userTurnId: string | null;
  agentTurnId: string | null;
  // Quality systems
  securityReport: SecurityReport | null;
  performanceReport: PerformanceReport | null;
  // Version control
  versionId: string | null;
  versionNumber: number | null;
  // Edit engine
  editApplied: boolean;
}

let commandsProcessed = 0;
export function getCommandsProcessed(): number { return commandsProcessed; }

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

// ── Chat management result builder ────────────────────────────────────────────

function buildChatCommandResult(
  agentMessage: string,
  chatOperation: string,
  targetSession: ConversationSession,
  jobId: string,
  conversationIntent: OrchestrationResult["conversationIntent"],
  userTurnId: string,
  agentTurnId: string,
  quickReplies: string[]
): OrchestrationResult {
  return {
    jobId,
    status: "success",
    responseMode: "acknowledge",
    clarificationQuestion: null,
    quickReplies,
    acknowledgment: null,
    normalizedCommand: agentMessage,
    detectedIntent: "chat_management",
    detectedMode: "direct",
    detectedUrl: null,
    tasks: [],
    outputFile: null,
    projectSlug: null,
    downloadUrl: null,
    message: agentMessage,
    validationReport: null,
    confidenceResult: null,
    regenerated: false,
    sessionId: targetSession.sessionId,
    conversationIntent,
    agentMessage,
    followUpQuestions: quickReplies,
    session: serializeSession(targetSession),
    webResearchUsed: false,
    webSources: [],
    webCrossCheckedFacts: [],
    webAdaptedPatterns: [],
    projectType: "frontend-standard",
    techStackSummary: "",
    fileTreeText: "",
    chatOperation,
    userTurnId,
    agentTurnId,
    securityReport: null,
    performanceReport: null,
    versionId: null,
    versionNumber: null,
    editApplied: false,
  };
}

export async function orchestrate(
  rawCommand: string,
  researchEnabled: boolean,
  sessionId?: string | null
): Promise<OrchestrationResult> {
  const jobId = makeJobId();
  commandsProcessed++;

  // ── Session setup ─────────────────────────────────────────────────────────
  const session = getOrCreateSession(sessionId);

  // ── Chat management commands — intercept BEFORE the full pipeline ─────────
  // These commands never trigger code generation; they return instantly.
  const chatCmd = detectChatCommand(rawCommand);
  if (chatCmd.type) {
    const userTurn = recordUserTurn(session, rawCommand);
    let agentMsg = "";

    switch (chatCmd.type) {
      case "reset_chat":
        // Wipe session context AND full turn history
        resetSession(session, { clearHistory: true });
        agentMsg = getChatCommandMessage("reset_chat");
        break;

      case "delete_last": {
        const result = deleteLastTurn(session);
        agentMsg = getChatCommandMessage("delete_last", { deletedCount: result.deleted.length });
        break;
      }

      case "delete_message": {
        const result = deleteTurnById(session, chatCmd.messageId!);
        agentMsg = getChatCommandMessage("delete_message", {
          messageId: chatCmd.messageId,
          found: result.deleted !== null,
        });
        break;
      }

      case "new_session": {
        // Create a completely independent session — old session is unaffected
        const freshSession = createSession();
        agentMsg = getChatCommandMessage("new_session");
        const agentTurnNew = recordAgentTurn(freshSession, agentMsg, { jobId });
        logger.info(
          { oldSessionId: session.sessionId, newSessionId: freshSession.sessionId },
          "New session created via chat command"
        );
        return buildChatCommandResult(
          agentMsg, chatCmd.type, freshSession, jobId,
          "new_task", userTurn.id, agentTurnNew.id,
          getChatCommandQuickReplies(chatCmd.type)
        );
      }
    }

    const agentTurn = recordAgentTurn(session, agentMsg, { jobId });
    logger.info({ sessionId: session.sessionId, chatOperation: chatCmd.type }, "Chat command handled");
    return buildChatCommandResult(
      agentMsg, chatCmd.type!, session, jobId,
      "new_task", userTurn.id, agentTurn.id,
      getChatCommandQuickReplies(chatCmd.type)
    );
  }

  // ── Normal generation pipeline ────────────────────────────────────────────
  const conversationIntent = detectConversationIntent(rawCommand, session);

  logger.info(
    { sessionId: session.sessionId, conversationIntent, taskState: session.taskState },
    "Orchestrating with session context"
  );

  const userTurn = recordUserTurn(session, rawCommand);

  if (conversationIntent === "explicit_reset") {
    resetSession(session);
  }

  // ── Step definitions ──────────────────────────────────────────────────────
  const tasks: TaskStep[] = [
    makeStep(1,  "Understand request"),
    makeStep(2,  "Detect mode"),
    makeStep(3,  "Build conditions"),
    makeStep(4,  "Apply project rules"),
    makeStep(5,  "Analyze URL"),
    makeStep(6,  "Multi-source research"),
    makeStep(7,  "Generate project files"),
    makeStep(8,  "Validate output"),
    makeStep(9,  "Score confidence"),
    makeStep(10, "Save & package project"),
  ];

  const setStep = (i: number, status: TaskStep["status"], detail?: string) => {
    tasks[i - 1].status = status;
    if (detail !== undefined) tasks[i - 1].detail = detail;
  };

  let validationReport: ValidationReport | null = null;
  let confidenceResult: ConfidenceResult | null = null;
  let regenerated = false;
  let securityReport: SecurityReport | null = null;
  let performanceReport: PerformanceReport | null = null;
  let versionId: string | null = null;
  let versionNumber: number | null = null;
  let editApplied = false;

  try {
    transitionState(session, "generating");

    // ── Step 1: Normalize ─────────────────────────────────────────────────
    setStep(1, "running");
    const normalized = normalizeCommand(rawCommand);
    setStep(1, "done", normalized.normalized);

    // ── Conversational layer assessment ───────────────────────────────────
    const assessment = assessAndPlan(rawCommand, normalized, session, conversationIntent);

    logger.info(
      { responseMode: assessment.responseMode, clarity: assessment.level },
      "Conversational assessment"
    );

    // ── CLARIFY path: ask one focused question, do not generate ───────────
    if (assessment.responseMode === "clarify") {
      tasks.slice(1).forEach((t) => { t.status = "skipped"; t.detail = "Waiting for clarification"; });

      const question = assessment.clarificationQuestion!;
      transitionState(session, "collecting");
      const agentTurnC = recordAgentTurn(session, question, { jobId });

      commandHistory.push({
        id: jobId,
        command: rawCommand,
        normalizedCommand: normalized.normalized,
        intent: normalized.intent,
        mode: "direct",
        outputFile: null,
        status: "clarify",
        timestamp: new Date().toISOString(),
      });

      return {
        jobId,
        status: "success",
        responseMode: "clarify",
        clarificationQuestion: question,
        quickReplies: assessment.quickReplies,
        acknowledgment: null,
        normalizedCommand: normalized.normalized,
        detectedIntent: normalized.intent,
        detectedMode: "direct",
        detectedUrl: normalized.url,
        tasks: tasks.slice(0, 1),
        outputFile: null,
        projectSlug: null,
        downloadUrl: null,
        message: question,
        validationReport: null,
        confidenceResult: null,
        regenerated: false,
        sessionId: session.sessionId,
        conversationIntent,
        agentMessage: question,
        followUpQuestions: [],
        session: serializeSession(session),
        webResearchUsed: false,
        webSources: [],
        webCrossCheckedFacts: [],
        webAdaptedPatterns: [],
        projectType: "frontend-standard",
        techStackSummary: "",
        fileTreeText: "",
        chatOperation: null,
        userTurnId: userTurn.id,
        agentTurnId: agentTurnC.id,
        securityReport: null,
        performanceReport: null,
        versionId: null,
        versionNumber: null,
        editApplied: false,
      };
    }

    // ── Step 2: Detect mode ───────────────────────────────────────────────
    setStep(2, "running");
    const mode = detectMode(normalized, researchEnabled);
    setStep(2, "done", `Mode: ${mode}`);

    // ── Step 3: Build conditions + merge session ───────────────────────────
    setStep(3, "running");
    const conditions = buildConditions(normalized);
    mergeConditionsFromInput(session, rawCommand, conditions.pageType, normalized.url);

    const sessionCond = session.collectedConditions;
    if (conversationIntent === "follow_up" || conversationIntent === "continue") {
      if (!normalized.uiStyle?.includes("dark") && !normalized.uiStyle?.includes("light")) {
        if (sessionCond.colorScheme === "dark") conditions.colorScheme = "dark";
        else if (sessionCond.colorScheme === "light") conditions.colorScheme = "light";
      }
      if (sessionCond.hasNavbar) conditions.hasNavbar = true;
      if (sessionCond.hasFooter) conditions.hasFooter = true;
      if (sessionCond.hasValidation) conditions.hasValidation = true;
    }

    // Merge collected page type from session if command didn't specify one
    if (!conditions.pageType && sessionCond.pageType) {
      conditions.pageType = sessionCond.pageType as typeof conditions.pageType;
    }

    if (!session.currentTask || conversationIntent === "new_task") {
      session.currentTask = normalized.normalized;
    }

    setStep(3, "done",
      `Page: ${conditions.pageType}, Style: ${conditions.uiStyle.join(", ")}` +
      (conversationIntent !== "new_task" && session.turns.length > 2
        ? ` [session: ${session.turnCount} turns, context carried]`
        : "")
    );

    // ── Step 4: Apply project rules ───────────────────────────────────────
    setStep(4, "running");
    const rules = getRules(conditions.colorScheme);
    setStep(4, "done", `Scheme: ${conditions.colorScheme}, Font: ${rules.typography.body}`);

    // ── Step 5: URL analysis ──────────────────────────────────────────────
    let urlAnalysis = null;
    const targetUrl = normalized.url ?? sessionCond.lastUrl ?? null;
    if (mode === "analyze" && targetUrl) {
      setStep(5, "running", `Analyzing ${targetUrl}`);
      try {
        urlAnalysis = await analyzeUrl(targetUrl);
        setStep(5, "done", `Found: ${urlAnalysis.hasNavbar ? "navbar " : ""}${urlAnalysis.hasForms ? "forms " : ""}${urlAnalysis.hasCards ? "cards" : ""}`);
      } catch (err) {
        setStep(5, "error", "URL analysis failed — proceeding with defaults");
        logger.error({ err }, "URL analysis error");
      }
    } else {
      setStep(5, "skipped", targetUrl ? `URL in session: ${targetUrl}` : "No URL provided");
    }

    // ── Step 6: Research (static KB + controlled web sources) ────────────
    let research: MultiSourceReport | null = null;
    let webReport: WebResearchReport | null = null;

    setStep(6, "running", "Consulting knowledge bases…");

    // Run static KB research and live web research in parallel
    [research, webReport] = await Promise.all([
      (mode === "research" || researchEnabled)
        ? performMultiSourceResearch(rawCommand, conditions.pageType, researchEnabled)
        : Promise.resolve(null),
      performWebResearch({
        rawCommand,
        pageType: conditions.pageType,
        colorScheme: conditions.colorScheme,
        researchModeEnabled: researchEnabled,
        maxSources: 4,
      }),
    ]);

    const consensusCount = research
      ? research.crossValidatedFindings.filter((f) => f.confirmedBy.length >= 2).length
      : 0;

    const staticDetail = research
      ? `${consensusCount} cross-validated KB findings`
      : "Internal rules";

    const webDetail = webReport?.triggered
      ? `${webReport.sourcesUsed.length}/${webReport.sourcesSearched} web sources${
          webReport.cached ? " (cached)" : ""
        } · ${webReport.crossCheckedFacts.length} cross-checked${
          webReport.discardedSources > 0 ? ` · ${webReport.discardedSources} noisy sources dropped` : ""
        }`
      : `Web: ${webReport?.triggerReason ?? "not triggered"}`;

    setStep(
      6,
      webReport?.triggered || research ? "done" : "skipped",
      `${staticDetail} · ${webDetail}`
    );

    // ── Step 7: Generate multi-file project structure ─────────────────────
    setStep(7, "running");
    const project = generateStructuredProject(conditions, rules, urlAnalysis);
    const fileCount = project.files.length;
    setStep(7, "done",
      `${fileCount} files generated (HTML + CSS layers + JS modules` +
      (fileCount > 8 ? ` + ${fileCount - 8} extra pages` : "") + ")"
    );

    // ── Step 8: Validate → Security scan → Performance optimize ─────────
    setStep(8, "running");
    let combinedHtml = project.combinedHtml;
    validationReport = validateOutput(combinedHtml);

    if (validationReport.canAutoFix) {
      combinedHtml = autoFixHtml(combinedHtml, validationReport);
      validationReport = validateOutput(combinedHtml);
    }

    // Security scan — auto-fix critical issues in-place
    securityReport = scanSecurity(combinedHtml);
    if (!securityReport.safe) {
      combinedHtml = securityReport.sanitizedHtml;
      logger.warn(
        { score: securityReport.score, blockedCount: securityReport.blockedCount },
        "Security issues auto-fixed"
      );
    }

    // Performance optimization — minify, defer, lazy-load
    performanceReport = optimizePerformance(combinedHtml);
    combinedHtml = performanceReport.optimizedHtml;

    const errorCount = validationReport.errors.length;
    setStep(
      8,
      errorCount === 0 ? "done" : "error",
      `Valid: ${validationReport.score}/100 (${validationReport.grade}) · ` +
      `Security: ${securityReport.score}/100 · ` +
      `Perf: ${performanceReport.score}/100 (${performanceReport.reductionPercent}% smaller)` +
      (validationReport.canAutoFix ? " [auto-fixed]" : "")
    );

    // ── Step 9: Score confidence ──────────────────────────────────────────
    setStep(9, "running");
    confidenceResult = scoreConfidence(combinedHtml, conditions, rules, validationReport, research);

    if (confidenceResult.recommendation === "regenerate" && !regenerated) {
      regenerated = true;
      logger.warn({ score: confidenceResult.overall }, "Confidence low — regenerating");
      const stricterConditions = { ...conditions, responsive: true, hasNavbar: true, animationsEnabled: false };
      const newProject = generateStructuredProject(stricterConditions, rules, urlAnalysis);
      let newHtml = newProject.combinedHtml;
      validationReport = validateOutput(newHtml);
      if (validationReport.canAutoFix) {
        newHtml = autoFixHtml(newHtml, validationReport);
        validationReport = validateOutput(newHtml);
      }
      confidenceResult = scoreConfidence(newHtml, stricterConditions, rules, validationReport, research);
      // Use the regenerated project
      project.files.splice(0, project.files.length, ...newProject.files);
    }

    setStep(
      9,
      confidenceResult.passesThreshold ? "done" : "error",
      `Confidence: ${confidenceResult.overall}/100 (${confidenceResult.grade})` +
      (regenerated ? " — regenerated once" : "")
    );

    // ── Step 10: Save + Package ───────────────────────────────────────────
    setStep(10, "running");
    const filename = generateFilename(conditions.pageType);
    saveOutput(filename, combinedHtml); // keep flat HTML for preview

    const packaged = await packageProject(
      combinedHtml,
      conditions.pageType,
      conditions,
      rules,
      validationReport.score,
      validationReport.grade,
      confidenceResult.overall,
      filename,
      project.files  // pass structured files to packager
    );

    saveProjectMeta(packaged.projectSlug, {
      filename,
      pageType: conditions.pageType,
      projectSlug: packaged.projectSlug,
      downloadUrl: packaged.downloadUrl,
      fileCount: packaged.files.length,
      validationScore: validationReport.score,
      confidenceScore: confidenceResult.overall,
    });

    // ── Version control + dependency manifest ────────────────────────────
    const projectBaseName = `${conditions.pageType}-page`;
    const depManifest = generateDependencyManifest({
      html: combinedHtml,
      projectName: projectBaseName,
      description: `Generated ${conditions.pageType} page — AGENT_OS`,
      pageType: conditions.pageType,
    });

    const recorded = recordVersion({
      sessionId: session.sessionId,
      projectBaseName,
      projectSlug: packaged.projectSlug,
      command: rawCommand,
      htmlContent: combinedHtml,
      files: project.files,
      validationScore: validationReport.score,
      confidenceScore: confidenceResult.overall,
      securityScore: securityReport?.score ?? 100,
      performanceScore: performanceReport?.score ?? 80,
    });
    versionId     = recorded.versionId;
    versionNumber = recorded.versionNumber;

    // ── Learning system update ────────────────────────────────────────────
    recordGeneration({
      sessionId: session.sessionId,
      command: rawCommand,
      pageType: conditions.pageType,
      colorScheme: conditions.colorScheme,
      validationScore: validationReport.score,
      confidenceScore: confidenceResult.overall,
      securityScore: securityReport?.score ?? 100,
      researchMode: researchEnabled,
      wasRegeneration: regenerated,
    });

    setStep(10, "done",
      `${packaged.files.length} files + ZIP · ${versionId} recorded · ${depManifest.detectedLibraries.length} deps scanned`
    );

    // ── Update session + build response ──────────────────────────────────
    transitionState(session, "awaiting_feedback");

    const postReplies = getPostGenerationReplies(conditions.pageType, session);
    const completionMsg = renderCompletionMessage(
      conditions.pageType,
      filename,
      validationReport.score,
      confidenceResult.overall,
      regenerated,
      postReplies
    );

    const { content: agentMessage, followUpQuestions } = buildAgentSummary(
      session,
      filename,
      validationReport.score,
      confidenceResult.overall,
      regenerated,
      `Generated ${conditions.pageType} page`
    );

    const agentTurn = recordAgentTurn(session, completionMsg, {
      outputFile: filename,
      jobId,
      validationScore: validationReport.score,
      confidenceScore: confidenceResult.overall,
      regenerated,
      followUpQuestions: postReplies,
    });

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

    return {
      jobId,
      status: "success",
      responseMode: assessment.responseMode === "acknowledge" ? "acknowledge" : "generate",
      clarificationQuestion: null,
      quickReplies: postReplies,
      acknowledgment: assessment.acknowledgment,
      normalizedCommand: normalized.normalized,
      detectedIntent: normalized.intent,
      detectedMode: mode,
      detectedUrl: normalized.url,
      tasks,
      outputFile: filename,
      projectSlug: packaged.projectSlug,
      downloadUrl: packaged.downloadUrl,
      message: `Generated ${conditions.pageType} project — ${packaged.files.length} files`,
      validationReport,
      confidenceResult,
      regenerated,
      sessionId: session.sessionId,
      conversationIntent,
      agentMessage: completionMsg,
      followUpQuestions: postReplies,
      session: serializeSession(session),
      // Web research results
      webResearchUsed: webReport?.triggered ?? false,
      webSources: webReport?.sourcesUsed ?? [],
      webCrossCheckedFacts: webReport?.crossCheckedFacts ?? [],
      webAdaptedPatterns: webReport?.adaptedPatterns ?? [],
      projectType: "frontend-standard",
      techStackSummary: "",
      fileTreeText: "",
      chatOperation: null,
      userTurnId: userTurn.id,
      agentTurnId: agentTurn.id,
      securityReport,
      performanceReport,
      versionId,
      versionNumber,
      editApplied,
    };

  } catch (err) {
    logger.error({ err, jobId }, "Orchestration failed");
    const errMsg = err instanceof Error ? err.message : String(err);
    tasks.forEach((t) => { if (t.status === "running") { t.status = "error"; t.detail = errMsg; } });

    transitionState(session, "idle");
    const errorMessage = renderErrorMessage(errMsg);
    recordAgentTurn(session, errorMessage, { jobId });

    commandHistory.push({
      id: jobId, command: rawCommand, normalizedCommand: rawCommand,
      intent: "unknown", mode: "direct", outputFile: null,
      status: "error", timestamp: new Date().toISOString(),
    });

    return {
      jobId,
      status: "error",
      responseMode: "generate",
      clarificationQuestion: null,
      quickReplies: [],
      acknowledgment: null,
      normalizedCommand: rawCommand,
      detectedIntent: "unknown",
      detectedMode: "direct",
      detectedUrl: null,
      tasks,
      outputFile: null,
      projectSlug: null,
      downloadUrl: null,
      message: `Agent error: ${errMsg}`,
      validationReport: null,
      confidenceResult: null,
      projectType: "frontend-standard",
      techStackSummary: "",
      fileTreeText: "",
      chatOperation: null,
      userTurnId: null,
      agentTurnId: null,
      regenerated: false,
      sessionId: session.sessionId,
      conversationIntent,
      agentMessage: errorMessage,
      followUpQuestions: [],
      session: serializeSession(session),
      webResearchUsed: false,
      webSources: [],
      webCrossCheckedFacts: [],
      webAdaptedPatterns: [],
      securityReport: null,
      performanceReport: null,
      versionId: null,
      versionNumber: null,
      editApplied: false,
    };
  }
}
