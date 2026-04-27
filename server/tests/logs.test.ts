import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { LogEntry } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

interface TenantLogsFile {
  tenantId: string;
  logs: LogEntry[];
}

describe("/api/logs", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns empty logs when file missing", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/logs/${tenantId}`).expect(200);
    expect(res.body).toEqual({ tenantId, logs: [] });
  });

  it("POST /:tenantId appends log and persists to disk", async () => {
    tenantId = await makeTestTenant();
    const entry = {
      id: "log-id-1",
      question: "Q?",
      answer: "A.",
      timestamp: new Date().toISOString(),
      wasUncertain: false
    };

    const res = await request(app).post(`/api/logs/${tenantId}`).send(entry).expect(201);
    expect(res.body).toMatchObject({ ...entry, tenantId });

    const filePath = path.join(tenantDir(tenantId), "logs.json");
    const onDisk = await readJson<TenantLogsFile>(filePath);
    expect(onDisk.logs).toHaveLength(1);
    expect(onDisk.logs[0]).toMatchObject({ ...entry, tenantId });
  });

  it("POST /:tenantId returns 400 for invalid payload", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/logs/${tenantId}`)
      .send({ id: "x", question: "q" })
      .expect(400);
    expect(res.body.error).toMatch(/invalid log entry/i);
  });

  it("GET /:tenantId returns appended logs in order", async () => {
    tenantId = await makeTestTenant();
    const base = { question: "q", answer: "a", wasUncertain: false };

    await request(app)
      .post(`/api/logs/${tenantId}`)
      .send({ id: "1", ...base, timestamp: "2025-01-01T00:00:00.000Z" })
      .expect(201);
    await request(app)
      .post(`/api/logs/${tenantId}`)
      .send({ id: "2", ...base, timestamp: "2025-01-02T00:00:00.000Z" })
      .expect(201);

    const res = await request(app).get(`/api/logs/${tenantId}`).expect(200);
    expect(res.body.logs.map((l: LogEntry) => l.id)).toEqual(["1", "2"]);
  });
});
