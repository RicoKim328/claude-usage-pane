export type Tokens = { input: number; output: number; cacheRead: number; cacheWrite: number }
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Choice = { model: string; effort: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-pane': {
      tokens: Tokens
      limits: Limit[]
      context: { tokens?: number; window: number; percent?: number }
      costUsd: number
      lastModel: string
      choice: Choice
    }
  }
}
