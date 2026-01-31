import { describe, expect, test } from "bun:test"
import type { PRData } from "../../src/github/types"

describe("context integration", () => {
  test("buildMultiReviewerPrompt includes file context when provided", async () => {
    const { buildMultiReviewerPrompt } = await import("../../src/ai/prompts")

    const pr: PRData = {
      owner: "test",
      repo: "test",
      number: 1,
      title: "Test PR",
      body: "Test body",
      author: "tester",
      baseSha: "abc",
      headSha: "def",
      baseRef: "main",
      headRef: "feature",
      additions: 10,
      deletions: 5,
      state: "OPEN",
      createdAt: "2024-01-01",
      commits: [],
      files: [{ path: "src/test.ts", additions: 10, deletions: 5, changeType: "MODIFIED" }],
      comments: [],
      reviews: [],
    }

    const diff = `diff --git a/src/test.ts b/src/test.ts
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
+import { foo } from "./foo"
 export function test() {
   return true
 }`

    const fileContext = {
      files: [
        {
          path: "src/test.ts",
          content: 'import { foo } from "./foo"\nexport function test() {\n  return true\n}',
          sizeBytes: 100,
          truncated: false,
        },
      ],
      skippedFiles: [],
    }

    const prompt = buildMultiReviewerPrompt(
      pr,
      diff,
      "You are a code reviewer.",
      "quality",
      fileContext,
    )

    expect(prompt).toContain("### Full File Context")
    expect(prompt).toContain("src/test.ts")
    expect(prompt).toContain('import { foo } from "./foo"')
    expect(prompt).toContain("<details>")
  })

  test("buildMultiReviewerPrompt works without file context", async () => {
    const { buildMultiReviewerPrompt } = await import("../../src/ai/prompts")

    const pr: PRData = {
      owner: "test",
      repo: "test",
      number: 1,
      title: "Test PR",
      body: "",
      author: "tester",
      baseSha: "abc",
      headSha: "def",
      baseRef: "main",
      headRef: "feature",
      additions: 1,
      deletions: 0,
      state: "OPEN",
      createdAt: "2024-01-01",
      commits: [],
      files: [],
      comments: [],
      reviews: [],
    }

    const prompt = buildMultiReviewerPrompt(pr, "diff content", "Review this.", "test")

    expect(prompt).not.toContain("### Full File Context")
    expect(prompt).toContain("diff content")
  })

  test("formatFileContext shows skipped files count", async () => {
    const { formatFileContext } = await import("../../src/ai/prompts")

    const result = formatFileContext(
      [{ path: "small.ts", content: "code", sizeBytes: 50, truncated: false }],
      ["large.ts", "huge.ts"],
    )

    expect(result).toContain("### Full File Context")
    expect(result).toContain("small.ts")
    expect(result).toContain("2 files skipped")
  })

  test("formatFileContext returns empty string when no files", async () => {
    const { formatFileContext } = await import("../../src/ai/prompts")

    const result = formatFileContext([], [])

    expect(result).toBe("")
  })
})
