# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### AI Web Agent (`artifacts/web-agent`)
- React + Vite frontend served at `/`
- Dark terminal aesthetic, sidebar navigation
- Pages: Console (`/`), Outputs (`/outputs`), Preview (`/preview`), Templates (`/templates`), History (`/history`)

### API Server (`artifacts/api-server`)
- Express 5 backend served at `/api`
- Agent modules in `artifacts/api-server/src/agent/`

## Agent Architecture (`artifacts/api-server/src/agent/`)

| Module | Purpose |
|---|---|
| `languageNormalizer.ts` | Converts Hinglish/English commands to normalized intents |
| `modeDetector.ts` | Detects mode: analyze (URL), research (internet), direct |
| `conditionEngine.ts` | Parses user conditions into structured page rules |
| `projectRuleEngine.ts` | Enforces design system: spacing, typography, colors, shadows |
| `urlAnalyzer.ts` | Uses Puppeteer to extract DOM, layout, and structure from URLs |
| `researchMode.ts` | Gathers UI best practices (local knowledge base) |
| `templateGenerator.ts` | Generates clean HTML for login, dashboard, index, register, form pages |
| `outputSystem.ts` | Saves generated files to `/output` directory |
| `taskOrchestrator.ts` | Orchestrates all agent steps end-to-end |

## API Endpoints

- `POST /api/agent/command` — process a Hinglish/English command
- `GET /api/agent/outputs` — list generated HTML files
- `GET /api/agent/preview/:filename` — get file content for preview
- `GET /api/agent/status` — agent system status
- `GET /api/agent/history` — command history
- `GET /api/agent/templates` — available page templates

## Output

Generated HTML files are saved to `/output` at the workspace root.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
