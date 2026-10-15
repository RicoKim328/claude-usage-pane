# usage-pane

**English** · [한국어](README.ko.md)

A Claude Code mod that shows **token usage, remaining usage-limit %, and model/effort pickers** in a pane.

## What it shows

| Section | Content |
| --- | --- |
| Session tokens | Input / output / cache read / cache write / total, running cost (USD), and a context-usage bar |
| Usage limits | Usage bars for the 5-hour, weekly (7-day) and spend limits, with **remaining %** and time until reset. A warning appears once the weekly limit is 90% used |
| Model / effort | The model of the latest response, plus Model and Effort pickers (applied from the next request) |

Colors follow usage: green below 70%, yellow from 70%, red from 90%.

## Install

Inside Claude Code:

```
/plugin install usage-pane --marketplace RicoKim328/claude-usage-pane
```

Once the mod is loaded, the pane opens automatically when an interactive session starts. If it doesn't, run `/usage`.

### Try it locally without installing

```bash
git clone https://github.com/RicoKim328/claude-usage-pane.git
claude --plugin-dir ./claude-usage-pane
```

## Usage

| Command | What it does |
| --- | --- |
| `/usage` | Pins the pane and opens it. It also opens automatically in later sessions. |
| `/usage off` | Unpins the pane and closes it. |

- Closing the pane with its close mark also unpins it, so it stays closed next session.
- The pinned state is kept across sessions.

### Changing model / effort

Pick a value in the **Model** or **Effort** selector at the bottom of the pane. It applies to every main-conversation request from then on.

- Model: `session default`, Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5
- Effort: `session default`, low, medium, high, xhigh, max
- With `session default` the mod overrides nothing and the session's own setting is used.
- Subagent requests are not affected.
- Effort is overridden only on requests that carry an effort setting.

## Good to know

- **Pane position:** docking on the right works only in the fullscreen layout (`CLAUDE_CODE_NO_FLICKER=1`). Otherwise the pane sits above the prompt.
- **Narrow terminals:** when there is no room for the pane, or it is unpinned, a summary such as `주간 (7일) 42% 남음` ("weekly (7-day) 42% left") is shown in the status line instead.
- **Usage limits** are measured for subscription accounts only. With an API key the pane shows "no measurement yet", and values fill in after the first response.
- The token total is the running sum of the **main conversation since the mod was enabled**. Subagent tokens are not included.
- The pane's labels and the status-line summary are currently in Korean.

## Development

```bash
claude plugin validate .    # check the manifest and hooks
claude plugin test .        # run tests/usage.test.ts
```

Layout:

```
.claude-plugin/plugin.json        mod info
.claude-plugin/marketplace.json   marketplace info
hooks/hooks.json                  hooks module path
hooks/register.tsx                pane and hooks implementation
types/index.d.ts                  $.state type contract
tests/usage.test.ts               tests
```
