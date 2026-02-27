# Skill Model Override

## Overview

The **Skill Model Override** feature allows you to specify different LLMs for specific skills. When a skill with a model override is executed, it automatically spawns a subagent session using the configured model instead of the current agent's model.

This is useful when certain skills require more powerful models (e.g., brainstorming with Claude Opus) while keeping the main agent on a faster, cheaper model (e.g., Claude Haiku).

## Configuration

Add the `skills` section to your `owo.json`:

```json
{
  "skills": {
    "enabled": true,
    "overrides": {
      "brainstorming": {
        "model": "anthropic/claude-opus-4-5",
        "variant": "high"
      },
      "writing-plans": {
        "model": "anthropic/claude-opus-4-5"
      },
      "systematic-debugging": {
        "model": "anthropic/claude-sonnet-4-5",
        "variant": "high"
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `model` | string | Yes | Model in `provider/model` format (e.g., `anthropic/claude-opus-4-5`) |
| `variant` | `"low"` \| `"default"` \| `"high"` | No | Thinking level / extended thinking variant |
| `temperature` | number (0-2) | No | Temperature for this skill |

## Architecture

### Component Overview

The skill-runner package consists of:

1. **SkillManager** - Manages skill sessions and model overrides
2. **Tools** - Provides `skill_run`, `skill_output`, and `skill_list` tools
3. **Event Handler** - Listens for session completion events

### Execution Flow

When an agent calls `skill_run`:

1. Check if the skill has a model override in `owo.json`
2. If yes, create a subagent session with the specified model
3. Execute the skill content in that session
4. Notify the parent agent when complete
5. Parent agent retrieves result with `skill_output`

## Available Tools

### `skill_info`

Get model override info for a specific skill BEFORE loading it.

```
skill_info(skill: "brainstorming")
```

Returns:
```
Skill "brainstorming" model override:
Model: anthropic/claude-opus-4-5
Variant: high

When you load this skill, use skill_run() to execute it with the configured model.
```

### `skill_run`

Execute a skill with its configured model override.

```
skill_run(
  skill: "brainstorming",
  prompt: "Design a new authentication system",
  skill_content: "<content from Skill tool>"
)
```

### `skill_output`

Get the output from a completed skill execution.

```
skill_output(session_id: "skill_abc12345")
```

### `skill_list`

List all skills with model overrides configured.

```
skill_list()
```

## Toast Notifications

When a skill with a model override is loaded, a toast notification will appear showing:

- **Title**: `Skill: <skill-name>`
- **Message**: `Model: <model-name> (<variant>)`

This helps you see which LLM is being used for each skill at a glance.

## Priority Order

The model used for a skill follows this priority:

```
owo.json skills.overrides[skill].model  >  Current agent's model
              (highest priority)              (fallback)
```

## Example Usage

### Scenario: Brainstorming with a Powerful Model

Your main agent (owO) uses `claude-sonnet-4-5` for speed, but you want brainstorming to use `claude-opus-4-5` for deeper thinking.

**Configuration:**
```json
{
  "skills": {
    "overrides": {
      "brainstorming": {
        "model": "anthropic/claude-opus-4-5",
        "variant": "high"
      }
    }
  }
}
```

**Usage:**
1. Agent loads the brainstorming skill using the Skill tool
2. Agent calls `skill_run("brainstorming", "Design a new feature", skill_content)`
3. A subagent session is created with `claude-opus-4-5`
4. The skill executes with the more powerful model
5. Agent receives notification when complete
6. Agent calls `skill_output` to get the result

## Files

| File | Description |
|------|-------------|
| `packages/skill-runner/src/skill-runner.ts` | Main plugin entry |
| `packages/skill-runner/src/skill-manager.ts` | Session management |
| `packages/skill-runner/src/tools.ts` | Tool definitions |
| `packages/skill-runner/src/types.ts` | TypeScript types |
| `packages/config/src/schema.ts` | Zod schema for config |
| `packages/config/schema.json` | JSON Schema for validation |

## Diagrams

### Overall Architecture

![Architecture](./diagrams/architecture.svg)

This diagram shows how the skill-runner plugin integrates with the OwO configuration system. The `skills.overrides` in `owo.json` maps skill names to model configurations, which the SkillManager uses to spawn subagent sessions with the appropriate model.

### Execution Flow

![Execution Flow](./diagrams/flow.svg)

This sequence diagram illustrates the complete flow when an agent executes a skill with a model override:

1. Agent calls `skill_run` with the skill name and prompt
2. skill-runner checks the config for model overrides
3. A subagent session is created with the specified model
4. The skill executes in the subagent
5. On completion, the parent agent is notified
6. Agent retrieves the result with `skill_output`

### Model Priority Order

![Priority](./diagrams/priority.svg)

This diagram shows the priority order for determining which model to use:

1. **Highest**: Model specified in `owo.json` under `skills.overrides[skill].model`
2. **Fallback**: The current agent's model (if no override is configured)

### Component Structure

![Components](./diagrams/components.svg)

This diagram shows the package structure and dependencies:

- **@owo/config**: Provides schema definitions and config loading
- **@owo/skill-runner**: The main plugin with SkillManager and tools
- External dependencies: `@opencode-ai/sdk` and `@opencode-ai/plugin`

### Skill Loading with Toast

![Skill Loading](./diagrams/skill-loading.svg)

This diagram shows the skill loading flow with toast notifications:

1. Agent loads a skill
2. Check if skill has model override configured
3. If yes: Show toast notification with model info, use configured model
4. If no: Use agent's default model
5. Execute the skill
