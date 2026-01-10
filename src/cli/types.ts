export interface OpencodeConfig {
  plugins?: string[]
  plugin?: string[]  // OpenCode also supports singular "plugin"
  [key: string]: unknown
}

export interface InstallOptions {
  noTui?: boolean
  configPath?: string
}

export type ConfigFormat = "json" | "jsonc"
