import { describe, expect, mock, test } from 'claude-code/testing'

import { bar, fmt, remaining, statusText } from '../hooks/register'

const PANE = {
  component: 'Pane',
  requestId: 'usage-pane',
  props: {
    title: 'Usage',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

describe('usage-pane', () => {
  test('formats numbers and remaining percent', async () => {
    expect(fmt(1234)).toBe('1.2k')
    expect(fmt(2_500_000)).toBe('2.50M')
    expect(remaining(23.5)).toBe(76.5)
    expect(remaining(120)).toBe(0)
    expect(bar(50, 10)).toBe('█████░░░░░')
  })

  test('pane draws token section and model/effort pickers', async ($, on) => {
    mock.clock(on)
    const ui = await $.ui.mount({ plugin: 'usage-pane', surface: 'terminal', ...PANE })
    expect(await ui.find({ type: 'Text', text: /현재 세션 토큰/ })).toBeDefined()
    expect(await ui.find({ key: 'model' })).toBeDefined()
    expect(await ui.find({ key: 'effort' })).toBeDefined()
    await ui.unmount()
  })

  test('status line text shows remaining % per window', async () => {
    expect(statusText([])).toBeUndefined()
    expect(statusText([{ kind: 'seven_day', percentUsed: 23.5 }])).toBe('주간 (7일) 76.5% 남음')
  })

  test('/usage off unpins, /usage pins again', async ($, on) => {
    const saved = new Map<string, unknown>()
    on('store.set', ($, e) => (saved.set(e.key, e.value), { value: undefined }))
    on('store.get', ($, e) => ({ value: saved.get(e.key) }))
    mock.clock(on)
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('ui.close', () => ({ value: undefined }))
    on('ui.panes', () => ({ value: [] }))
    on('ui.status', () => ({ value: undefined }))
    const run = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
    await $.command.run({ ...run, command: 'usage', args: 'off' })
    expect(saved.get('pinned')).toBe(false)
    const r = await $.command.run({ ...run, command: 'usage', args: '' })
    expect(saved.get('pinned')).toBe(true)
    expect(r.text).toBe('Usage pane pinned on the right.')
  })
})
