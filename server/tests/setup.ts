import { afterEach, beforeEach, vi } from "vitest";

/**
 * Tests rely on the absence of process.env.VERCEL to exercise local file writes.
 * If a test sets VERCEL=1 to cover hosted-demo behavior, this guarantees the
 * next test does not inherit that flag.
 */
beforeEach(() => {
  delete process.env.VERCEL;
});

let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
let consoleLogSpy: ReturnType<typeof vi.spyOn> | undefined;

/**
 * Routes intentionally call console.error on expected failure paths
 * (e.g. OpenAI errors). Silence by default; individual tests can
 * re-spy if they need to assert.
 *
 * NOTE: We only restore *these* spies (not vi.restoreAllMocks) so that
 * per-file vi.mock(...) module mocks remain intact across tests.
 */
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
  consoleLogSpy?.mockRestore();
});
