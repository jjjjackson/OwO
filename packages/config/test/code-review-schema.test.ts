import { expect, test, describe } from "bun:test"
import {
  ReviewerConfigSchema,
  CodeReviewConfigSchema,
  ReviewVerifyConfigSchema,
  ReviewOutputConfigSchema,
  ReviewerToolsSchema,
  DEFAULT_REVIEWER_TOOLS,
} from "../src/schema"

describe("ReviewerConfigSchema", () => {
  test("accepts valid reviewer with agent only", () => {
    const input = { agent: "oracle" }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.agent).toBe("oracle")
  })

  test("accepts reviewer with focus", () => {
    const input = { agent: "explorer", focus: "security vulnerabilities" }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.agent).toBe("explorer")
    expect(result.focus).toBe("security vulnerabilities")
  })

  test("accepts reviewer with context as array of strings", () => {
    const input = { agent: "oracle", context: ["inline instructions", "more instructions"] }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.context).toEqual(["inline instructions", "more instructions"])
  })

  test("accepts reviewer with context as array with file reference", () => {
    const input = { agent: "oracle", context: [{ file: "review-guide.md" }] }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.context).toEqual([{ file: "review-guide.md" }])
  })

  test("accepts reviewer with mixed context array", () => {
    const input = { agent: "oracle", context: ["inline text", { file: "guide.md" }] }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.context).toEqual(["inline text", { file: "guide.md" }])
  })

  test("rejects reviewer without agent", () => {
    const input = { focus: "security" }
    expect(() => ReviewerConfigSchema.parse(input)).toThrow()
  })

  test("accepts reviewer with tools config", () => {
    const input = {
      agent: "oracle",
      tools: { read: true, grep: true, bash: false },
    }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.tools).toEqual({ read: true, grep: true, bash: false })
  })

  test("accepts reviewer with empty tools config", () => {
    const input = { agent: "oracle", tools: {} }
    const result = ReviewerConfigSchema.parse(input)
    expect(result.tools).toEqual({})
  })
})

describe("CodeReviewConfigSchema", () => {
  test("defaults enabled to true", () => {
    const input = {}
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.enabled).toBe(true)
  })

  test("defaults reviewers to single oracle agent", () => {
    const input = {}
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.reviewers).toEqual([{ agent: "oracle" }])
  })

  test("accepts 1 reviewer", () => {
    const input = { reviewers: [{ agent: "explorer" }] }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.reviewers).toHaveLength(1)
  })

  test("accepts 2 reviewers", () => {
    const input = {
      reviewers: [{ agent: "oracle" }, { agent: "explorer", focus: "performance" }],
    }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.reviewers).toHaveLength(2)
  })

  test("rejects empty reviewers array", () => {
    const input = { reviewers: [] }
    expect(() => CodeReviewConfigSchema.parse(input)).toThrow()
  })

  test("rejects more than 2 reviewers", () => {
    const input = {
      reviewers: [{ agent: "oracle" }, { agent: "explorer" }, { agent: "architect" }],
    }
    expect(() => CodeReviewConfigSchema.parse(input)).toThrow()
  })

  test("accepts verify config with array guidance", () => {
    const input = { verify: { guidance: ["Check all tests pass"] } }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.verify?.guidance).toEqual(["Check all tests pass"])
  })

  test("accepts verify config with file guidance array", () => {
    const input = { verify: { guidance: [{ file: "verify-guide.md" }] } }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.verify?.guidance).toEqual([{ file: "verify-guide.md" }])
  })

  test("accepts output config with template array", () => {
    const input = { output: { template: [{ file: "output-template.md" }] } }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.output?.template).toEqual([{ file: "output-template.md" }])
  })

  test("accepts full config", () => {
    const input = {
      enabled: true,
      reviewers: [
        { agent: "oracle", focus: "architecture" },
        { agent: "explorer", context: [{ file: "security-checklist.md" }] },
      ],
      verify: { guidance: ["Run all verification commands"] },
      output: { template: [{ file: "review-template.md" }] },
    }
    const result = CodeReviewConfigSchema.parse(input)
    expect(result.reviewers).toHaveLength(2)
    expect(result.verify?.guidance).toEqual(["Run all verification commands"])
    expect(result.output?.template).toEqual([{ file: "review-template.md" }])
  })
})

describe("ReviewVerifyConfigSchema", () => {
  test("accepts empty object", () => {
    const result = ReviewVerifyConfigSchema.parse({})
    expect(result.guidance).toBeUndefined()
  })

  test("accepts guidance as array of strings", () => {
    const result = ReviewVerifyConfigSchema.parse({ guidance: ["check tests"] })
    expect(result.guidance).toEqual(["check tests"])
  })

  test("accepts guidance as array with file reference", () => {
    const result = ReviewVerifyConfigSchema.parse({ guidance: [{ file: "guide.md" }] })
    expect(result.guidance).toEqual([{ file: "guide.md" }])
  })

  test("accepts tools config", () => {
    const result = ReviewVerifyConfigSchema.parse({ tools: { read: true, lsp: true } })
    expect(result.tools).toEqual({ read: true, lsp: true })
  })
})

describe("ReviewOutputConfigSchema", () => {
  test("accepts empty object", () => {
    const result = ReviewOutputConfigSchema.parse({})
    expect(result.template).toBeUndefined()
  })

  test("accepts template as array with file reference", () => {
    const result = ReviewOutputConfigSchema.parse({ template: [{ file: "template.md" }] })
    expect(result.template).toEqual([{ file: "template.md" }])
  })
})

describe("ReviewerToolsSchema", () => {
  test("accepts valid tools record", () => {
    const input = { read: true, grep: true, edit: false }
    const result = ReviewerToolsSchema.parse(input)
    expect(result).toEqual({ read: true, grep: true, edit: false })
  })

  test("accepts empty object", () => {
    const result = ReviewerToolsSchema.parse({})
    expect(result).toEqual({})
  })

  test("accepts undefined", () => {
    const result = ReviewerToolsSchema.parse(undefined)
    expect(result).toBeUndefined()
  })
})

describe("DEFAULT_REVIEWER_TOOLS", () => {
  test("has read enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.read).toBe(true)
  })

  test("has grep enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.grep).toBe(true)
  })

  test("has glob enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.glob).toBe(true)
  })

  test("has lsp enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.lsp).toBe(true)
  })

  test("does not have edit enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.edit).toBeUndefined()
  })

  test("does not have bash enabled", () => {
    expect(DEFAULT_REVIEWER_TOOLS.bash).toBeUndefined()
  })
})
