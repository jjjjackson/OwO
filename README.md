# OwO

## Agent orchestration for OpenCode

OwO supercharges [OpenCode](https://opencode.ai) with specialized AI agents that handle different aspects of development. Instead of one agent doing everything, you get a team of experts — each optimized for their domain.

## Features

- **4 Specialized Agents** — Explorer, Librarian, Oracle, UI Planner
- **Background Tasks** — Fire multiple agents in parallel
- **Thinking Mode Variants** — Configure thinking levels (high, xhigh, max) per agent
- **Keyword Triggers** — `ultrawork`, `deep research`, `explore codebase`
- **Session History** — Query past sessions to learn from previous work
- **Code Intelligence** — Search symbols via LSP
- **Todo Continuation** — Auto-reminds when tasks are incomplete
- **Auto-Updates** — Toast notification when new version available

## Why OwO?

OwO takes the more lightweight sub-agent and multi-model approach from [zenox](https://github.com/CYBERBOYAYUSH/zenox). This lets you configure each agent to a model more tuned for the task.

For example, you **can** configure orchestration to have something like:

- **Explore** finds code fast — optimized for codebase search with a lightweight model (built into OpenCode, but you can use the `prompt-injector` to enhance it)
- **Librarian** digs deep into docs — researches libraries, finds GitHub examples, citations included
- **Oracle** thinks strategically — architecture decisions, debugging, technical trade-offs
- **UI Planner** designs beautifully — CSS, animations, interfaces that don't look AI-generated

You can set your main agent to automatically delegate to specialists when needed. Or — better yet — keep the **build** agent lean and create an orchestrator agent to coordinate!

See [`packages/example`](packages/example) for complete example configurations.

## Quick Start

```bash
bunx owo install
```

That's it. Restart OpenCode and the agents are ready.

### Setting Up Delegation

To enable agent delegation (where one agent coordinates others), you need:

1. **The orchestration plugin** — Add [`@owo/orchestration`](packages/orchestration/src/index.ts) to your plugins

2. **An orchestrator agent** — Either:
   - Create a custom agent with orchestration instructions in its prompt (see [`packages/example/agent/owO.md`](packages/example/agent/owO.md) for an example)
   - Or use the [`@owo/prompt-injector`](packages/prompt-injector/src/index.ts) plugin to inject orchestration context into existing agents like `build` or `plan`

### Example Configurations

Check out the example configs in [`packages/example`](packages/example):

- **[`owo.example.json`](packages/example/owo.example.json)** — Full OwO config with keywords, prompts, orchestration, and tool settings
- **[`opencode.example.json`](packages/example/opencode.example.json)** — OpenCode config showing how to wire up plugins and configure multiple agents with different models and permissions

### How delegation works

You don't need to call agents directly. The main agent (Build/Plan) automatically delegates:

```
You: "Where's the authentication logic?"
→ Explorer searches the codebase

You: "How does React Query handle caching?"
→ Librarian fetches official docs + real examples

You: "Should I use Redux or Zustand here?"
→ Oracle analyzes trade-offs for your codebase

You: "Make this dashboard look better"
→ UI Planner redesigns with proper aesthetics
```

## Keyword Triggers

Include these magic words in your prompt to unlock special modes:

| Keyword              | What it does                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| `ultrawork` or `ulw` | Maximum multi-agent coordination — fires parallel background agents, sets max precision |
| `deep research`      | Comprehensive exploration — fires 3-4 background agents (explorer + librarian)          |
| `explore codebase`   | Codebase mapping — multiple explorers search in parallel                                |

### Examples

```
You: "ultrawork - add authentication to this app"
→ ⚡ Ultrawork Mode activated
→ Fires explorer + librarian in parallel
→ Maximum precision engaged

You: "deep research how this project handles errors"
→ 🔬 Deep Research Mode activated
→ Fires multiple explorers + librarians
→ Waits for comprehensive results before proceeding

You: "explore codebase for payment logic"
→ 🔍 Explore Mode activated
→ Multiple explorers search patterns, implementations, tests
```

You'll see a toast notification when these modes activate.

## Background Tasks

Need comprehensive research? Fire multiple agents in parallel:

```
background_task(agent="explorer", description="Find auth code", prompt="...")
background_task(agent="librarian", description="JWT best practices", prompt="...")

// Both run simultaneously while you keep working
// You're notified when all tasks complete
```

### Toast Notifications

OwO shows toast notifications for background task events:

- ⚡ **Task Launched** — Shows task description and agent
- ✅ **Task Completed** — Shows duration and remaining count
- 🎉 **All Complete** — Shows summary of all finished tasks
- ❌ **Task Failed** — Shows error message

## Todo Continuation

OwO automatically reminds you to continue working when:

- You have incomplete tasks in your todo list
- The session goes idle
- There's been enough time since the last reminder (10 second cooldown)

This keeps you on track without manual intervention. The agent will be prompted to continue until all todos are complete or blocked.

## Configuration

### Custom Models and Agents

This all has to be done manually in `owo.json`. You may wish to check [example](packages/example/owo.example.json) for this

Config is setup in `~/.config/opencode/owo.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/RawToast/OwO/refs/heads/master/packages/config/schema.json",
  "agents": {
    "explorer": { "model": "anthropic/claude-sonnet-4.5" },
    "oracle": { "model": "openai/gpt-5.2" }
  }
}
```

### Thinking Mode Variants

Configure thinking/reasoning levels for models that support extended thinking (like Claude, GPT with reasoning, etc.):

```json
{
  "agents": {
    "oracle": {
      "model": "anthropic/claude-opus-4-5",
      "variant": "high"
    },
    "ui-planner": {
      "model": "openai/gpt-5.2-codex",
      "variant": "xhigh"
    }
  }
}
```

Available variants (model-dependent):

- `low` — Minimal thinking
- `medium` — Balanced thinking
- `high` — Extended thinking
- `xhigh` — Extra high thinking
- `max` — Maximum reasoning depth

Variants are applied safely — if an agent doesn't exist or the model doesn't support the variant, it gracefully falls back.

### Disable Agents or MCPs

```json
{
  "disabled_agents": ["ui-planner"],
  "disabled_mcps": ["grep_app"]
}
```

## Included MCP Servers

OwO auto-loads these MCP servers for agents to use:

| Server                  | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| **grep_app**            | Search millions of GitHub repos instantly   |
| **sequential-thinking** | Step-by-step reasoning for complex problems |

## API Tools

OwO includes direct API integrations (faster than MCP, no protocol overhead):

| Tool                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| **exa_search**       | AI-powered web search with semantic understanding  |
| **exa_code_context** | Code-focused search (GitHub, docs, Stack Overflow) |
| **exa_crawl**        | Extract content from specific URLs                 |
| **context7_resolve** | Resolve library names to Context7 IDs              |
| **context7_docs**    | Query up-to-date library documentation             |

### Setup API Keys

These tools require API keys. You can configure them in two ways:

**Option 1: Config file (recommended)**

Add to `~/.config/opencode/owo.json`:

```json
{
  "tools": {
    "exa": {
      "key": "your-exa-api-key"
    },
    "context7": {
      "key": "your-context7-api-key"
    }
  }
}
```

**Option 2: Environment variables**

```bash
# Add to ~/.zshrc or ~/.bashrc
export EXA_API_KEY="your-exa-api-key"
export CONTEXT7_API_KEY="your-context7-api-key"
```

**Quick setup script (env vars):**

```bash
# Run this to add API keys to your shell config
cat >> ~/.zshrc << 'EOF'

# OwO API Keys
export EXA_API_KEY="your-exa-api-key"
export CONTEXT7_API_KEY="your-context7-api-key"
EOF

# Reload your shell
source ~/.zshrc
```

Then replace the placeholder values with your actual keys.

**Get your keys:**

- Exa: https://exa.ai (free tier: $10 credits)
- Context7: https://context7.com/dashboard (free tier available)

### Disable Tools

Don't want a specific tool? Disable it in config:

```json
{
  "tools": {
    "exa": {
      "enabled": false
    }
  }
}
```

## CLI

```bash
bunx owo install          # Add to opencode.json + configure models
bunx owo install --no-tui # Non-interactive (uses defaults)
bunx owo config           # Reconfigure models anytime
bunx owo --help           # Show all commands
```

## Credits

- [OpenCode](https://opencode.ai) — The CLI this extends
- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) — Inspiration for orchestration patterns
- [zenox](https://github.com/CYBERBOYAYUSH/zenox) - Originally forked form this great setup

## License

[MIT](LICENSE)
