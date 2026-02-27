import type { SkillModelConfig } from "@owo/config"

/**
 * Skill execution request
 */
export interface SkillExecutionRequest {
  skillName: string
  sessionID: string
  parentAgent?: string
  context?: string
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  success: boolean
  output?: string
  error?: string
  usedModel?: string
}

/**
 * Skill session tracking
 */
export interface SkillSession {
  id: string
  skillName: string
  sessionID: string
  modelConfig: SkillModelConfig
  status: "running" | "completed" | "failed"
  startedAt: Date
  completedAt?: Date
  output?: string
  error?: string
}
