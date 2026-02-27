import type { PromptInjectorConfig } from "@owo/config"
import { resolveContext } from "@owo/config"

/**
 * Resolves global context items that apply to ALL agents
 */
export function resolveGlobalContext(
  config: PromptInjectorConfig | undefined,
  configDir: string,
): string[] {
  if (!config?.enabled) return []
  if (!config.global) return []

  return config.global.map((item) => resolveContext(item, configDir)).filter((s) => s.length > 0)
}

/**
 * Resolves context items for a specific agent
 */
export function resolveAgentContext(
  agent: string | undefined,
  config: PromptInjectorConfig | undefined,
  configDir: string,
): string[] {
  if (!config?.enabled) return []
  if (!agent || !config.agents?.[agent]) return []

  const agentConfig = config.agents[agent]
  const contextItems = agentConfig.context ?? []

  return contextItems.map((item) => resolveContext(item, configDir)).filter((s) => s.length > 0)
}

/**
 * Builds the complete prompt for an agent
 * Combines global context (applies to all agents) + agent-specific context
 */
export function buildPrompt(
  agent: string | undefined,
  config: PromptInjectorConfig | undefined,
  configDir: string,
): string | undefined {
  const globalParts = resolveGlobalContext(config, configDir)
  const agentParts = resolveAgentContext(agent, config, configDir)
  const allParts = [...globalParts, ...agentParts]

  return allParts.length > 0 ? allParts.join("\n\n") : undefined
}
