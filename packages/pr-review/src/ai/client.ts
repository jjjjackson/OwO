import { createOpencode } from "@opencode-ai/sdk"

export type AIClient = Awaited<ReturnType<typeof createOpencode>>

/** Default retry configuration */
const DEFAULT_RETRIES = 3
const RETRY_DELAY_MS = 2000

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create opencode AI client
 */
export async function createAIClient(): Promise<AIClient> {
  return await createOpencode()
}

/**
 * Send a prompt and get response with retry logic
 */
export async function prompt(
  client: AIClient,
  message: string,
  options?: {
    sessionId?: string
    model?: { providerID: string; modelID: string }
    temperature?: number
    retries?: number
  },
): Promise<{ sessionId: string; response: string }> {
  const maxRetries = options?.retries ?? DEFAULT_RETRIES
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create or reuse session
      const sessionId = options?.sessionId ?? (await client.client.session.create()).data?.id
      if (!sessionId) {
        throw new Error("Failed to create AI session")
      }

      // Send prompt
      const result = await client.client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text: message }],
          ...(options?.model && { model: options.model }),
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
        },
      })

      // Extract text response
      const parts = result.data?.parts
      if (!parts || parts.length === 0) {
        throw new Error(
          `Empty response from AI (attempt ${attempt}/${maxRetries}) - API may be having issues`,
        )
      }

      const textPart = parts.find((p: any) => p.type === "text")
      if (!textPart || textPart.type !== "text") {
        throw new Error("No text response from AI")
      }

      return {
        sessionId,
        response: textPart.text,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if this is a retryable error (empty response = API hiccup)
      const isRetryable =
        lastError.message.includes("Empty response") ||
        lastError.message.includes("No response parts")

      if (isRetryable && attempt < maxRetries) {
        console.warn(
          `[ai-client] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${RETRY_DELAY_MS}ms...`,
        )
        await sleep(RETRY_DELAY_MS * attempt) // Exponential backoff
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error("Unknown error in prompt")
}

/**
 * Close the AI client
 */
export function closeAIClient(client: AIClient): void {
  client.server.close()
}
