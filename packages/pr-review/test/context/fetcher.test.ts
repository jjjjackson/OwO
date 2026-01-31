import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { join } from "path"

const FIXTURES_DIR = join(import.meta.dir, "fixtures")

describe("context/fetcher", () => {
  beforeAll(() => {
    // Ensure fixtures directory exists
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true })
    }

    // Create sample.ts
    writeFileSync(
      join(FIXTURES_DIR, "sample.ts"),
      'export function hello() {\n  return "world"\n}\n',
    )

    // Create large.txt (150KB)
    const largeContent = "Lorem ipsum dolor sit amet. ".repeat(6000)
    writeFileSync(join(FIXTURES_DIR, "large.txt"), largeContent)

    // Create small.txt
    writeFileSync(join(FIXTURES_DIR, "small.txt"), "Small file content")
  })

  afterAll(() => {
    // Clean up generated fixtures
    rmSync(join(FIXTURES_DIR, "large.txt"), { force: true })
    rmSync(join(FIXTURES_DIR, "small.txt"), { force: true })
  })

  test("fetchLocalContext reads existing files", async () => {
    const { fetchLocalContext } = await import("../../src/context/fetcher")

    const result = fetchLocalContext(FIXTURES_DIR, ["sample.ts"])

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe("sample.ts")
    expect(result.files[0].content).toContain("hello")
    expect(result.skippedFiles).toHaveLength(0)
  })

  test("fetchLocalContext skips missing files", async () => {
    const { fetchLocalContext } = await import("../../src/context/fetcher")

    const result = fetchLocalContext(FIXTURES_DIR, ["nonexistent.ts", "sample.ts"])

    expect(result.files).toHaveLength(1)
    expect(result.skippedFiles).toContain("nonexistent.ts")
    expect(result.skippedReason.get("nonexistent.ts")).toContain("not found")
  })

  test("fetchLocalContext skips files exceeding size limit", async () => {
    const { fetchLocalContext } = await import("../../src/context/fetcher")

    const result = fetchLocalContext(FIXTURES_DIR, ["large.txt"], {
      enabled: true,
      maxFileSizeKb: 100,
      maxTotalSizeKb: 500,
    })

    expect(result.files).toHaveLength(0)
    expect(result.skippedFiles).toContain("large.txt")
    expect(result.skippedReason.get("large.txt")).toContain("too large")
  })

  test("fetchLocalContext respects total size limit", async () => {
    const { fetchLocalContext } = await import("../../src/context/fetcher")

    // small.txt is 18 bytes, sample.ts is 45 bytes
    // Set limit to 50 bytes - allows first file but not both
    const result = fetchLocalContext(FIXTURES_DIR, ["small.txt", "sample.ts"], {
      enabled: true,
      maxFileSizeKb: 100,
      maxTotalSizeKb: 0.05, // ~50 bytes - allows small.txt but not both
    })

    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe("small.txt")
    expect(result.skippedFiles).toHaveLength(1)
    expect(result.skippedReason.get("sample.ts")).toContain("total context size limit")
  })

  test("canFetchLocalContext returns true when files exist", async () => {
    const { canFetchLocalContext } = await import("../../src/context/fetcher")

    expect(canFetchLocalContext(FIXTURES_DIR, ["sample.ts"])).toBe(true)
    expect(canFetchLocalContext(FIXTURES_DIR, ["nonexistent.ts", "sample.ts"])).toBe(true)
  })

  test("canFetchLocalContext returns false when no files exist", async () => {
    const { canFetchLocalContext } = await import("../../src/context/fetcher")

    expect(canFetchLocalContext(FIXTURES_DIR, ["nonexistent.ts"])).toBe(false)
    expect(canFetchLocalContext(FIXTURES_DIR, [])).toBe(false)
    expect(canFetchLocalContext("", ["sample.ts"])).toBe(false)
  })
})
