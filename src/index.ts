/**
 * ayush-opencode - Custom OpenCode Plugin
 *
 * This plugin provides:
 * 1. Custom subagents: explorer, librarian, oracle, ui-planner
 * 2. Orchestration injection into Build/Plan agents for better delegation
 */

import type { Plugin } from "@opencode-ai/plugin"
import {
  explorerAgent,
  librarianAgent,
  oracleAgent,
  uiPlannerAgent,
} from "./agents"
import { ORCHESTRATION_PROMPT } from "./orchestration/prompt"

export const AyushOpenCodePlugin: Plugin = async (ctx) => {
  return {
    async config(config) {
      // Initialize agent config if not present
      config.agent = config.agent ?? {}

      // Register custom subagents
      config.agent.explorer = explorerAgent
      config.agent.librarian = librarianAgent
      config.agent.oracle = oracleAgent
      config.agent["ui-planner"] = uiPlannerAgent

      // Inject orchestration into Build agent (append to existing prompt)
      if (config.agent.build) {
        const existingPrompt = config.agent.build.prompt ?? ""
        config.agent.build.prompt = existingPrompt + ORCHESTRATION_PROMPT
      }

      // Inject orchestration into Plan agent (append to existing prompt)
      if (config.agent.plan) {
        const existingPrompt = config.agent.plan.prompt ?? ""
        config.agent.plan.prompt = existingPrompt + ORCHESTRATION_PROMPT
      }
    },
  }
}

// Default export for OpenCode plugin system
export default AyushOpenCodePlugin

// Named exports for advanced usage
export {
  explorerAgent,
  librarianAgent,
  oracleAgent,
  uiPlannerAgent,
} from "./agents"

export { ORCHESTRATION_PROMPT } from "./orchestration/prompt"

export type {
  BuiltinAgentName,
  AgentOverrideConfig,
  AgentOverrides,
} from "./agents"
