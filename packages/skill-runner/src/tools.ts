/**
 * Skill Runner Tools
 *
 * Provides tools for executing skills with model overrides:
 * - skill_run: Execute a skill with its configured model override
 * - skill_output: Get output from a completed skill execution
 */

import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { OpencodeClient } from "@opencode-ai/sdk"
import type { SkillsConfig } from "@owo/config"
import type { SkillManager } from "./skill-manager"

export type SkillRunnerTools = {
  [key: string]: ToolDefinition
}

export function createSkillRunnerTools(
  manager: SkillManager,
  client: OpencodeClient,
  skillsConfig: SkillsConfig | undefined,
): SkillRunnerTools {
  const skillRun = tool({
    description: `Execute a skill with its configured model override.
If the skill has a model override in owo.json, it will run in a subagent with that model.
Otherwise, it returns instructions to use the normal skill tool.

Use this when you want a skill to run with a specific, more powerful model.`,
    args: {
      skill: tool.schema.string().describe("Name of the skill to execute (e.g., 'brainstorming')"),
      prompt: tool.schema
        .string()
        .describe("The user request/context to pass to the skill"),
      skill_content: tool.schema
        .string()
        .optional()
        .describe("The skill content (if already loaded). If not provided, skill will be loaded."),
    },
    async execute(args, context) {
      // Check if skill has a model override
      const overrides = skillsConfig?.overrides
      const skillConfig = overrides?.[args.skill]

      if (!skillConfig) {
        return `No model override configured for skill "${args.skill}".
Use the normal Skill tool to load and execute this skill with the current agent's model.

To configure a model override, add to owo.json:
{
  "skills": {
    "overrides": {
      "${args.skill}": {
        "model": "anthropic/claude-opus-4-5"
      }
    }
  }
}`
      }

      // We need the skill content - if not provided, instruct to load it first
      if (!args.skill_content) {
        return `Skill "${args.skill}" has model override configured (${skillConfig.model}).
Please load the skill content first using the Skill tool, then call skill_run again with the skill_content parameter.`
      }

      try {
        const session = await manager.executeWithModel(client, {
          skillName: args.skill,
          skillContent: args.skill_content,
          modelConfig: skillConfig,
          parentSessionID: context.sessionID,
          userPrompt: args.prompt,
        })

        return `Skill "${args.skill}" execution started with model override.
- Session ID: ${session.id}
- Model: ${skillConfig.model}
- Variant: ${skillConfig.variant ?? "default"}

The skill is running in a subagent. You will be notified when it completes.
Use skill_output(session_id="${session.id}") to retrieve the result.`
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error"
        return `Failed to execute skill "${args.skill}": ${errorMsg}`
      }
    },
  })

  const skillOutput = tool({
    description: `Get the output from a completed skill execution.
Use this after a skill_run has completed.`,
    args: {
      session_id: tool.schema
        .string()
        .describe("Session ID from skill_run (e.g., 'skill_abc12345')"),
    },
    async execute(args) {
      const output = await manager.getOutput(client, args.session_id)
      return output ?? `No output found for session ${args.session_id}`
    },
  })

  const skillList = tool({
    description: `List all skills with model overrides configured.
Shows which skills will run with specific models.`,
    args: {},
    async execute() {
      const overrides = skillsConfig?.overrides

      if (!overrides || Object.keys(overrides).length === 0) {
        return `No skill model overrides configured.

To configure, add to owo.json:
{
  "skills": {
    "overrides": {
      "brainstorming": {
        "model": "anthropic/claude-opus-4-5",
        "variant": "high"
      }
    }
  }
}`
      }

      const lines = ["Configured skill model overrides:", ""]
      for (const [skillName, config] of Object.entries(overrides)) {
        const variant = config.variant ? ` (variant: ${config.variant})` : ""
        const temp = config.temperature !== undefined ? ` (temp: ${config.temperature})` : ""
        lines.push(`- ${skillName}: ${config.model}${variant}${temp}`)
      }

      return lines.join("\n")
    },
  })

  const skillInfo = tool({
    description: `Get model override info for a specific skill.
Call this BEFORE loading a skill to know which LLM it will use.
Returns the configured model override, or indicates the skill will use the current agent's model.`,
    args: {
      skill: tool.schema.string().describe("Name of the skill (e.g., 'brainstorming', 'beautiful-mermaid')"),
    },
    async execute(args) {
      const overrides = skillsConfig?.overrides
      const skillConfig = overrides?.[args.skill]

      if (!skillConfig) {
        return `Skill "${args.skill}" has no model override configured.
It will use the current agent's model when loaded.`
      }

      const variant = skillConfig.variant ? `\nVariant: ${skillConfig.variant}` : ""
      const temp = skillConfig.temperature !== undefined ? `\nTemperature: ${skillConfig.temperature}` : ""

      return `Skill "${args.skill}" model override:
Model: ${skillConfig.model}${variant}${temp}

When you load this skill, use skill_run() to execute it with the configured model.`
    },
  })

  return {
    skill_run: skillRun,
    skill_output: skillOutput,
    skill_list: skillList,
    skill_info: skillInfo,
  }
}
