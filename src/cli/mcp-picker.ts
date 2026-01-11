import * as p from "@clack/prompts"
import pc from "picocolors"
import { MCP_SERVERS, type McpName } from "./constants"

export async function askConfigureMcps(): Promise<"keep_all" | "customize" | null> {
  const result = await p.select({
    message: "Configure MCP servers?",
    options: [
      {
        value: "keep_all",
        label: "Keep all enabled (Recommended)",
        hint: "All MCPs are free & enhance capabilities",
      },
      {
        value: "customize",
        label: "Customize",
        hint: "Disable specific MCPs",
      },
    ],
  })

  if (p.isCancel(result)) return null
  return result as "keep_all" | "customize"
}

export async function pickMcpsToDisable(
  currentDisabled: McpName[]
): Promise<McpName[] | null> {
  p.note(
    `${pc.dim("All MCPs are free and recommended for best experience.")}\n${pc.dim("Only disable if you have specific conflicts.")}`,
    "MCP Servers"
  )

  const options = MCP_SERVERS.map((mcp) => {
    const isDisabled = currentDisabled.includes(mcp.name)
    const hint = mcp.recommended
      ? `${mcp.description} ${pc.green("• Recommended")}`
      : mcp.description

    return {
      value: mcp.name,
      label: `${mcp.displayName}${isDisabled ? pc.yellow(" (Currently disabled)") : ""}`,
      hint,
    }
  })

  const selected = await p.multiselect({
    message: "Select MCPs to DISABLE:",
    options,
    required: false,
  })

  if (p.isCancel(selected)) return null
  return selected as McpName[]
}

export function showMcpStatus(disabledMcps: McpName[]): void {
  p.log.info("MCP Server Status:")
  for (const mcp of MCP_SERVERS) {
    const isDisabled = disabledMcps.includes(mcp.name)
    const status = isDisabled
      ? pc.red("✗ Disabled")
      : pc.green("✓ Enabled")
    const rec = mcp.recommended ? pc.dim(" (Recommended)") : ""
    p.log.message(`  ${mcp.displayName}: ${status}${rec}`)
  }
}
