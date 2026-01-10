import * as p from "@clack/prompts"
import type { OpencodeConfig } from "./types"
import type { AgentName, AgentInfo } from "./constants"
import { AGENTS, DEFAULT_MODELS } from "./constants"

const CUSTOM_MODEL_OPTION = "__custom__"

export function extractUserModels(config: OpencodeConfig): string[] {
  const models: Set<string> = new Set()

  // Extract models from provider.*.models
  const provider = config.provider as Record<string, unknown> | undefined
  if (!provider) return []

  for (const providerConfig of Object.values(provider)) {
    if (typeof providerConfig !== "object" || providerConfig === null) continue

    const providerModels = (providerConfig as Record<string, unknown>).models
    if (typeof providerModels !== "object" || providerModels === null) continue

    for (const modelId of Object.keys(providerModels)) {
      models.add(modelId)
    }
  }

  return Array.from(models).sort()
}

interface ModelOption {
  value: string
  label: string
  hint?: string
}

function buildModelOptions(
  agent: AgentInfo,
  userModels: string[],
  currentModel?: string
): ModelOption[] {
  const options: ModelOption[] = []

  // 1. Recommended default
  const isDefault = !currentModel || currentModel === agent.defaultModel
  options.push({
    value: agent.defaultModel,
    label: `${agent.defaultModel}${isDefault ? " (Current)" : ""}`,
    hint: "Recommended - Default",
  })

  // 2. User's custom models from their config
  for (const model of userModels) {
    if (model === agent.defaultModel) continue // Skip if same as default
    const isCurrent = currentModel === model
    options.push({
      value: model,
      label: `${model}${isCurrent ? " (Current)" : ""}`,
      hint: "From your config",
    })
  }

  // 3. Current model if not in above options
  if (
    currentModel &&
    currentModel !== agent.defaultModel &&
    !userModels.includes(currentModel)
  ) {
    options.push({
      value: currentModel,
      label: `${currentModel} (Current)`,
      hint: "Custom",
    })
  }

  // 4. Custom input option
  options.push({
    value: CUSTOM_MODEL_OPTION,
    label: "Enter custom model name",
    hint: "Get names from models.dev",
  })

  return options
}

export async function pickModelForAgent(
  agent: AgentInfo,
  userModels: string[],
  currentModel?: string
): Promise<string | null> {
  const options = buildModelOptions(agent, userModels, currentModel)

  const selected = await p.select({
    message: `${agent.displayName} agent model:`,
    options,
  })

  if (p.isCancel(selected)) return null

  if (selected === CUSTOM_MODEL_OPTION) {
    const customModel = await p.text({
      message: "Enter custom model name:",
      placeholder: "e.g., anthropic/claude-sonnet-4 (see models.dev)",
      validate: (value) => {
        if (!value.trim()) return "Model name is required"
        if (!value.includes("/")) return "Model should be in format: provider/model-name"
        return undefined
      },
    })

    if (p.isCancel(customModel)) return null
    return customModel as string
  }

  return selected as string
}

export async function pickModelsForAllAgents(
  userModels: string[],
  currentModels: Partial<Record<AgentName, string>>
): Promise<Partial<Record<AgentName, string>> | null> {
  const result: Partial<Record<AgentName, string>> = {}

  for (const agent of AGENTS) {
    const current = currentModels[agent.name]
    const model = await pickModelForAgent(agent, userModels, current)

    if (model === null) return null // User cancelled

    // Only store if different from default
    if (model !== agent.defaultModel) {
      result[agent.name] = model
    }
  }

  return result
}

export async function askConfigureModels(): Promise<"defaults" | "customize" | null> {
  const result = await p.select({
    message: "Configure sub-agent models?",
    options: [
      {
        value: "defaults",
        label: "Use recommended defaults",
        hint: "No config file needed",
      },
      {
        value: "customize",
        label: "Customize models",
        hint: "Choose models for each agent",
      },
    ],
  })

  if (p.isCancel(result)) return null
  return result as "defaults" | "customize"
}

export async function selectAgentsToReconfigure(
  currentModels: Partial<Record<AgentName, string>>
): Promise<AgentName[] | null> {
  const options = AGENTS.map((agent) => {
    const current = currentModels[agent.name] ?? agent.defaultModel
    return {
      value: agent.name,
      label: agent.displayName,
      hint: `current: ${current}`,
    }
  })

  const selected = await p.multiselect({
    message: "Which agents to configure?",
    options,
    required: true,
  })

  if (p.isCancel(selected)) return null
  return selected as AgentName[]
}
