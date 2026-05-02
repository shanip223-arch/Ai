/**
 * File Decision Engine (re-export convenience)
 *
 * The actual decision logic lives in projectIntelligenceEngine.ts.
 * This module re-exports the types and functions that other modules
 * (taskOrchestrator, projectTemplateEngine) need to import.
 */

export {
  analyzeProjectRequirements,
  formatFileTree,
  type FileDecisionPlan,
  type ProjectType,
  type CssMode,
  type JsMode,
  type TechStackChoice,
  type PlannedFile,
} from "./projectIntelligenceEngine.js";
