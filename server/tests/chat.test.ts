import path from "path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { getHandbookText, saveHandbook } from "../src/lib/handbookStore";
import type { LogEntry } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
}));

interface TenantLogsFile {
  tenantId: string;
  logs: LogEntry[];
}

describe("/api/chat", () => {
  let tenantId!: string;

  beforeEach(() => {
    mockCreate.mockReset();
  });

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("POST / returns 400 for invalid body", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).post("/api/chat").send({ question: "hi" }).expect(400);
    expect(res.body.error).toMatch(/invalid request body/i);
  });

  it("POST / returns 400 when handbook is missing", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Hours?", tenantId })
      .expect(400);
    expect(res.body.error).toMatch(/no handbook uploaded/i);
  });

  it("POST / returns answer, logs entry, and calls OpenAI with handbook in system prompt", async () => {
    tenantId = await makeTestTenant();
    const handbookPlain = "PROGRAM OVERVIEW\nOur hours are 9am to 5pm.";
    await saveHandbook(tenantId, handbookPlain);
    const handbookOnDisk = await getHandbookText(tenantId);
    expect(handbookOnDisk).not.toBeNull();

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "We open at 9am and close at 5pm." } }]
    });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What are your hours?", tenantId })
      .expect(200);

    expect(res.body.answer).toContain("9am");
    expect(res.body.wasUncertain).toBe(false);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toBe("gpt-4o");
    expect(call.temperature).toBe(0.4);
    const systemContent = call.messages.find((m: { role: string }) => m.role === "system")?.content;
    expect(typeof systemContent).toBe("string");
    expect(systemContent as string).toContain(handbookOnDisk!);

    const filePath = path.join(tenantDir(tenantId), "logs.json");
    const onDisk = await readJson<TenantLogsFile>(filePath);
    expect(onDisk.logs).toHaveLength(1);
    expect(onDisk.logs[0].question).toBe("What are your hours?");
    expect(onDisk.logs[0].answer).toBe(res.body.answer);
    expect(onDisk.logs[0].wasUncertain).toBe(false);
  });

  it("POST / sets wasUncertain when answer signals uncertainty", async () => {
    tenantId = await makeTestTenant();
    await saveHandbook(tenantId, "PROGRAM OVERVIEW\nSomething.");

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "I'm not sure about that — please contact the front desk for help."
          }
        }
      ]
    });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Obscure question?", tenantId })
      .expect(200);

    expect(res.body.wasUncertain).toBe(true);
    const filePath = path.join(tenantDir(tenantId), "logs.json");
    const onDisk = await readJson<TenantLogsFile>(filePath);
    expect(onDisk.logs[0].wasUncertain).toBe(true);
  });

  it("POST / returns 500 when OpenAI fails", async () => {
    tenantId = await makeTestTenant();
    await saveHandbook(tenantId, "PROGRAM OVERVIEW\nX.");
    mockCreate.mockRejectedValue(new Error("API down"));

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Q", tenantId })
      .expect(500);
    expect(res.body.error).toMatch(/failed to get a response/i);
  });
});
