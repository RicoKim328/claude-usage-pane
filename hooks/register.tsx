import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Choice, Limit, Tokens } from '../types'

const PANE = 'usage-pane'
const KEEP = 'session' // "session" = no override, keep the session's own setting

const tokens = atom({ plugin: 'usage-pane', key: 'tokens' } as const, {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
})
const limits = atom({ plugin: 'usage-pane', key: 'limits' } as const, [])
const context = atom({ plugin: 'usage-pane', key: 'context' } as const, { window: 0 })
const costUsd = atom({ plugin: 'usage-pane', key: 'costUsd' } as const, 0)
const lastModel = atom({ plugin: 'usage-pane', key: 'lastModel' } as const, '')
const choice = atom({ plugin: 'usage-pane', key: 'choice' } as const, {
  model: KEEP,
  effort: KEEP,
})

const MODELS = [
  { value: KEEP, label: 'session default' },
  { value: 'claude-fable-5-1', label: 'Fable 5.1' },
  { value: 'claude-opus-5-5', label: 'Opus 5.5' },
  { value: 'claude-sonnet-5-5', label: 'Sonnet 5.5' },
  { value: 'claude-haiku-5-5', label: 'Haiku 5.5' },
]
const EFFORTS = [
  { value: KEEP, label: 'session default' },
  { value: 'low', label: 'low' },
  { value: 'medium', label: 'medium' },
  { value: 'high', label: 'high' },
  { value: 'xhigh', label: 'xhigh' },
  { value: 'max', label: 'max' },
]
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

const LIMIT_NAMES: Record<string, string> = {
  five_hour: "5시간",
  seven_day: '주간 (7일)',
  spend_limit: '지출 한도',
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function bar(percentUsed: number, width = 20): string {
  const used = Math.min(width, Math.max(0, Math.round((percentUsed / 100) * width)))
  return '█'.repeat(used) + '░'.repeat(width - used)
}

export function remaining(percentUsed: number): number {
  return Math.max(0, Math.round((100 - percentUsed) * 10) / 10)
}

function resetIn(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!(ms > 0)) return ''
  const h = Math.floor(ms / 3_600_000)
  const d = Math.floor(h / 24)
  return d > 0 ? ` · ${d}일 ${h % 24}시간 후 리셋` : ` · ${h}시간 ${Math.floor((ms % 3_600_000) / 60_000)}분 후 리셋`
}

function color(percentUsed: number): 'green' | 'yellow' | 'red' {
  return percentUsed >= 90 ? 'red' : percentUsed >= 70 ? 'yellow' : 'green'
}

const PINNED = 'pinned' // $.store key, kept across sessions; absent = pinned
const DOCK_COLUMNS = 46

async function isPinned($: EngineInterface): Promise<boolean> {
  return (await $.store.get(PINNED)) !== false
}

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Usage', columns: DOCK_COLUMNS })
}

export function statusText(lims: readonly Limit[]): string | undefined {
  const parts = lims
    .filter(l => l.kind in LIMIT_NAMES)
    .map(l => `${LIMIT_NAMES[l.kind]} ${remaining(l.percentUsed)}% 남음`)

  return parts.length > 0 ? parts.join(' · ') : undefined
}

// While the pane is not on screen (narrow terminal, unpinned), keep the
// remaining % in the status line instead so it is never out of sight.
async function refreshStatus($: EngineInterface) {
  const isShown = (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced)
  $.ui.status(isShown ? undefined : statusText(await read($, limits)))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'usage',
      description: 'Show token usage, weekly limit and model/effort pickers in a pane',
    })
    const u = await $.session.usage()
    await update($, limits, () => u.rateLimits as Limit[])
    await update($, context, () => u.context)
    await update($, costUsd, () => u.cost?.usd ?? 0)
    const current = await $.session.model()
    await update($, lastModel, () => current ?? '')
    if (e.isInteractive && (await isPinned($))) void openPane($)
    void refreshStatus($)

    return next(e)
  })

  // A surface attached later (resume, remote client): seat the pinned pane there.
  on('session.attach', async ($, e, next) => {
    if (await isPinned($)) void openPane($)

    return next(e)
  })

  // /usage        → pin and open (always shown on the right)
  // /usage off    → unpin and close
  on('command.run', { command: 'usage' }, async ($, e) => {
    if (e.args.trim() === 'off') {
      await $.store.set(PINNED, false)
      await $.ui.close({ id: PANE })
      void refreshStatus($)

      return { text: 'Usage pane unpinned. Run /usage to pin it again.' }
    }
    await $.store.set(PINNED, true)
    const opened = await openPane($)
    void refreshStatus($)
    if (!opened.isPlaced) return { text: `Usage pane pinned; waiting for room: ${opened.reason}` }
    if (!e.presentation.isFullscreen) {
      return {
        text: 'Usage pane pinned. It docks on the right only in the fullscreen layout (CLAUDE_CODE_NO_FLICKER=1); here it sits above the prompt.',
      }
    }

    return { text: 'Usage pane pinned on the right.' }
  })

  // Closing it with the close mark unpins it, so it stays closed next session too.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') {
      await $.store.set(PINNED, false)
      void refreshStatus($)
    }

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits as Limit[])
    await update($, context, () => e.context)
    if (e.cost) await update($, costUsd, () => e.cost?.usd ?? 0)
    void refreshStatus($)

    return next(e)
  })

  // Apply the picked model/effort to every main-loop request.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const c = await read($, choice)
    let step = e
    if (c.model !== KEEP) step = { ...step, model: c.model }
    if (c.effort !== KEEP && e.effort !== undefined) step = { ...step, effort: c.effort as Effort }

    return yield* next(step)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined && e.usage) {
      const u = e.usage
      await update($, tokens, (t: Tokens) => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cacheRead: t.cacheRead + u.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
      }))
      await update($, lastModel, () => u.model)
    }

    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const Select = 'Select' in ui ? ui.Select : undefined
    const t = await read($, tokens)
    const ctx = await read($, context)
    const lims = await read($, limits)
    const cost = await read($, costUsd)
    const model = await read($, lastModel)
    const c = await read($, choice)
    const now = await $.clock.now()
    const total = t.input + t.output + t.cacheRead + t.cacheWrite
    const weekly = lims.find(l => l.kind === 'seven_day')

    return (
      <Box flexDirection="column">
        <Text bold>현재 세션 토큰</Text>
        <Text>  입력 {fmt(t.input)} · 출력 {fmt(t.output)}</Text>
        <Text dimColor>  캐시 읽기 {fmt(t.cacheRead)} · 캐시 쓰기 {fmt(t.cacheWrite)}</Text>
        <Text>  합계 {fmt(total)}{cost > 0 ? ` · $${cost.toFixed(2)}` : ''}</Text>
        {ctx.percent !== undefined && (
          <Text>
            {'  '}컨텍스트 {fmt(ctx.tokens ?? 0)}/{fmt(ctx.window)}{' '}
            <Text color={color(ctx.percent)}>{bar(ctx.percent, 10)}</Text> {ctx.percent}%
          </Text>
        )}
        <Text> </Text>

        <Text bold>사용 한도</Text>
        {lims.length === 0 && <Text dimColor>  아직 측정값 없음 (첫 응답 후 표시, 구독 계정 전용)</Text>}
        {lims.map(l => (
          <Box flexDirection="column">
            <Text>  {LIMIT_NAMES[l.kind] ?? l.kind}</Text>
            <Text>
              {'  '}<Text color={color(l.percentUsed)}>{bar(l.percentUsed)}</Text>{' '}
              <Text bold>{remaining(l.percentUsed)}% 남음</Text>
            </Text>
            <Text dimColor>  {l.percentUsed}% 사용{resetIn(l.resetsAt, now)}</Text>
          </Box>
        ))}
        {weekly && weekly.percentUsed >= 90 && <Text color="red">  ⚠ 주간 한도가 거의 소진되었습니다</Text>}
        <Text> </Text>

        <Text bold>모델 · 계산량</Text>
        <Text dimColor>  최근 응답 모델: {model || '-'}</Text>
        {Select ? (
          <Box flexDirection="column">
            <Select
              key="model"
              label="Model: "
              options={MODELS}
              value={c.model}
              onSelect={v => void update($, choice, (o: Choice) => ({ ...o, model: v }))}
            />
            <Select
              key="effort"
              label="Effort: "
              options={EFFORTS}
              value={c.effort}
              onSelect={v => void update($, choice, (o: Choice) => ({ ...o, effort: v }))}
            />
          </Box>
        ) : (
          <Text dimColor>  model {c.model} · effort {c.effort}</Text>
        )}
        <Text dimColor>  다음 요청부터 적용됩니다</Text>
      </Box>
    )
  })
}
