/**
 * SkillManager - Handles skill execution with model overrides
 *
 * When a skill has a model override configured, this manager:
 * 1. Creates a subagent session with the specified model
 * 2. Executes the skill content in that session
 * 3. Returns the result to the parent agent
 */

import type { OpencodeClient } from "@opencode-ai/sdk"
import type { SkillModelConfig } from "@owo/config"
import type { SkillSession } from "./types"

export class SkillManager {
  private sessions = new Map<string, SkillSession>()
  private mainSessionID: string | undefined

  setMainSession(sessionID: string | undefined): void {
    this.mainSessionID = sessionID
  }

  getMainSession(): string | undefined {
    return this.mainSessionID
  }

  private generateSessionId(): string {
    return `skill_${crypto.randomUUID().slice(0, 8)}`
  }

  /**
   * Execute a skill with a specific model override
   */
  async executeWithModel(
    client: OpencodeClient,
    input: {
      skillName: string
      skillContent: string
      modelConfig: SkillModelConfig
      parentSessionID: string
      userPrompt: string
    },
  ): Promise<SkillSession> {
    // Create child session for skill execution
    const createResult = await client.session.create({
      body: {
        parentID: input.parentSessionID,
      },
    })

    const sessionData = "data" in createResult ? createResult.data : createResult
    const sessionID = sessionData?.id

    if (!sessionID) {
      throw new Error("Failed to create skill session")
    }

    // Create session record
    const session: SkillSession = {
      id: this.generateSessionId(),
      skillName: input.skillName,
      sessionID,
      modelConfig: input.modelConfig,
      status: "running",
      startedAt: new Date(),
    }

    this.sessions.set(session.id, session)

    // Build the prompt with skill content
    const fullPrompt = `<skill_content name="${input.skillName}">
${input.skillContent}
</skill_content>

Now execute this skill for the following request:

${input.userPrompt}`

    // Parse model string into providerID/modelID format
    // Expected format: "provider/model" (e.g., "anthropic/claude-opus-4-5")
    const parseModel = (modelString: string): { providerID: string; modelID: string } | undefined => {
      const parts = modelString.split("/")
      if (parts.length >= 2) {
        return {
          providerID: parts[0],
          modelID: parts.slice(1).join("/"),
        }
      }
      return undefined
    }

    const parsedModel = parseModel(input.modelConfig.model)

    // Send prompt to the session with model override
    try {
      await client.session.prompt({
        path: { id: sessionID },
        body: {
          // Apply model override (SDK expects { providerID, modelID })
          ...(parsedModel && { model: parsedModel }),
          parts: [{ type: "text", text: fullPrompt }],
        },
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      session.status = "failed"
      session.error = errorMsg
      session.completedAt = new Date()
      console.error(`[skill-runner] Failed to execute skill "${input.skillName}": ${errorMsg}`)
    }

    return session
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SkillSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Find session by opencode session ID
   */
  findBySessionID(sessionID: string): SkillSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.sessionID === sessionID) {
        return session
      }
    }
    return undefined
  }

  /**
   * Handle session idle event - mark skill as completed
   */
  handleSessionIdle(sessionID: string): SkillSession | null {
    const session = this.findBySessionID(sessionID)

    if (!session || session.status !== "running") {
      return null
    }

    session.status = "completed"
    session.completedAt = new Date()

    return session
  }

  /**
   * Get output from completed skill session
   */
  async getOutput(client: OpencodeClient, sessionId: string): Promise<string | undefined> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return `Skill session ${sessionId} not found`
    }

    if (session.status === "running") {
      return `Skill "${session.skillName}" is still running`
    }

    if (session.status === "failed") {
      return `Skill "${session.skillName}" failed: ${session.error ?? "Unknown error"}`
    }

    // Read messages from the skill session
    try {
      const messagesResult = await client.session.messages({
        path: { id: session.sessionID },
      })

      const messages = "data" in messagesResult ? messagesResult.data : messagesResult

      if (!messages || !Array.isArray(messages)) {
        return `Skill "${session.skillName}" completed but could not retrieve output`
      }

      type MessageWrapper = {
        info: { role: string }
        parts: Array<{ type: string; text?: string }>
      }

      const assistantMessages = (messages as MessageWrapper[]).filter(
        (m) => m.info.role === "assistant" && m.parts && m.parts.length > 0,
      )

      if (assistantMessages.length === 0) {
        return `Skill "${session.skillName}" completed but no output found`
      }

      const lastMessage = assistantMessages[assistantMessages.length - 1]
      const textParts = lastMessage.parts.filter((p) => p.type === "text")
      const output = textParts.map((p) => p.text ?? "").join("\n")

      return output || `Skill "${session.skillName}" completed but output was empty`
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      return `Failed to retrieve output for skill "${session.skillName}": ${errorMsg}`
    }
  }

  /**
   * List all active skill sessions
   */
  listActiveSessions(): SkillSession[] {
    return [...this.sessions.values()].filter((s) => s.status === "running")
  }

  /**
   * Clear completed sessions
   */
  clearCompleted(): void {
    for (const [id, session] of this.sessions) {
      if (session.status !== "running") {
        this.sessions.delete(id)
      }
    }
  }
}
