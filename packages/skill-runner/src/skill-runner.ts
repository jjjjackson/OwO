/**
 * @owo/skill-runner
 *
 * Skill model override plugin for OpenCode.
 * Allows running skills with specific LLMs via subagent sessions.
 *
 * Configuration in owo.json:
 * {
 *   "skills": {
 *     "enabled": true,
 *     "overrides": {
 *       "brainstorming": {
 *         "model": "anthropic/claude-opus-4-5",
 *         "variant": "high"
 *       },
 *       "systematic-debugging": {
 *         "model": "anthropic/claude-sonnet-4-5"
 *       }
 *     }
 *   }
 * }
 */

import type { Plugin } from "@opencode-ai/plugin"
import type { Event } from "@opencode-ai/sdk"
import { loadConfig } from "@owo/config"
import { SkillManager } from "./skill-manager"
import { createSkillRunnerTools } from "./tools"

const SKILL_TOAST_DURATION = 3000

const SkillRunnerPlugin: Plugin = async (ctx) => {
  let configResult
  try {
    configResult = loadConfig(ctx.directory)
  } catch (err) {
    const errorMessage = err instanceof Error ? (err.stack ?? err.message) : String(err)
    console.error(`[owo/skill-runner] Failed to load config: ${errorMessage}`)
    throw err
  }

  const { config } = configResult

  // Check if disabled
  if (config.skills?.enabled === false) {
    return {}
  }

  // Initialize skill manager
  const skillManager = new SkillManager()

  // Create tools
  const tools = createSkillRunnerTools(skillManager, ctx.client, config.skills)

  // Helper to show skill model toast
  const showSkillModelToast = async (skillName: string, model: string, variant?: string) => {
    const variantText = variant ? ` (${variant})` : ""
    await ctx.client.tui
      .showToast({
        body: {
          title: `Skill: ${skillName}`,
          message: `Model: ${model}${variantText}`,
          variant: "info",
          duration: SKILL_TOAST_DURATION,
        },
      })
      .catch(() => {})
  }

  return {
    tool: tools,

    // Intercept skill loading to show model info
    "tool.result": async (
      input: { name: string; args: Record<string, unknown> },
      _output: unknown,
    ) => {
      // Check if this is the Skill tool being called
      if (input.name === "mcp_skill" || input.name === "Skill") {
        const skillName = input.args?.name as string | undefined
        if (skillName) {
          // Check if this skill has a model override
          const skillConfig = config.skills?.overrides?.[skillName]
          if (skillConfig) {
            await showSkillModelToast(skillName, skillConfig.model, skillConfig.variant)
          }
        }
      }
    },

    event: async (input: { event: Event }) => {
      const { event } = input

      // Track main session on creation
      if (event.type === "session.created") {
        const props = event.properties as { info?: { id?: string; parentID?: string } }
        const sessionInfo = props?.info

        // Only set main session if it's not a child session
        if (sessionInfo?.id && !sessionInfo?.parentID) {
          skillManager.setMainSession(sessionInfo.id)
        }
      }

      // Cleanup on session deletion
      if (event.type === "session.deleted") {
        const props = event.properties as { info?: { id?: string } }
        const sessionID = props?.info?.id

        if (sessionID && sessionID === skillManager.getMainSession()) {
          skillManager.setMainSession(undefined)
        }
      }

      // Detect skill session completion via session.idle
      if (event.type === "session.idle") {
        const props = event.properties as { sessionID?: string }
        const sessionID = props?.sessionID
        if (!sessionID) return

        // Check if this is one of our skill sessions
        const session = skillManager.handleSessionIdle(sessionID)

        if (session) {
          // Notify main session that skill completed
          const mainSessionID = skillManager.getMainSession()
          if (mainSessionID) {
            const message = `<system-reminder>
[SKILL EXECUTION COMPLETE]
Skill: ${session.skillName}
Session ID: ${session.id}
Model: ${session.modelConfig.model}

Use skill_output(session_id="${session.id}") to retrieve the result.
</system-reminder>`

            try {
              await ctx.client.session.prompt({
                path: { id: mainSessionID },
                body: {
                  noReply: false, // Trigger response to process the result
                  parts: [{ type: "text", text: message }],
                },
              })
            } catch (err) {
              // Silently ignore notification errors
              console.warn(
                `[skill-runner] Failed to notify main session: ${err instanceof Error ? err.message : String(err)}`,
              )
            }
          }
        }
      }
    },
  }
}

export default SkillRunnerPlugin

// Export types
export type { SkillSession, SkillExecutionRequest, SkillExecutionResult } from "./types"
export { SkillManager } from "./skill-manager"
