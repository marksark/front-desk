import { randomUUID } from "crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { cleanupTenant } from "./_helpers";

describe("/api/tenants", () => {
  const tenantsToCleanup: string[] = [];

  afterEach(async () => {
    for (const id of tenantsToCleanup) {
      await cleanupTenant(id);
    }
    tenantsToCleanup.length = 0;
  });

  it("GET / returns a sorted tenant list including fixture ids", async () => {
    const res = await request(app).get("/api/tenants").expect(200);
    expect(res.body).toHaveProperty("tenants");
    expect(Array.isArray(res.body.tenants)).toBe(true);
    const ids = res.body.tenants.map((t: { id: string }) => t.id);
    expect(ids).toContain("sunshine-academy");
    const sorted = [...ids].sort((a: string, b: string) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it("POST / returns 201 and creates tenant directory", async () => {
    const tenantId = `test-${randomUUID()}`;
    tenantsToCleanup.push(tenantId);

    const res = await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    expect(res.body).toEqual({ id: tenantId });
  });

  it("POST / returns 400 for invalid tenant id", async () => {
    const res = await request(app)
      .post("/api/tenants")
      .send({ tenantId: "Invalid_ID!" })
      .expect(400);
    expect(res.body).toHaveProperty("error");
    expect(String(res.body.error)).toMatch(/invalid tenant id/i);
  });

  it("POST / returns 409 when tenant already exists", async () => {
    const tenantId = `test-${randomUUID()}`;
    tenantsToCleanup.push(tenantId);

    await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    const res = await request(app).post("/api/tenants").send({ tenantId }).expect(409);
    expect(res.body).toHaveProperty("error");
    expect(String(res.body.error)).toMatch(/already exists/i);
  });

  it("POST / succeeds when adding multiple distinct tenants in a row", async () => {
    const tenantA = `test-${randomUUID()}`;
    const tenantB = `test-${randomUUID()}`;
    const tenantC = `test-${randomUUID()}`;
    tenantsToCleanup.push(tenantA, tenantB, tenantC);

    const resA = await request(app).post("/api/tenants").send({ tenantId: tenantA }).expect(201);
    const resB = await request(app).post("/api/tenants").send({ tenantId: tenantB }).expect(201);
    const resC = await request(app).post("/api/tenants").send({ tenantId: tenantC }).expect(201);

    expect(resA.body).toEqual({ id: tenantA });
    expect(resB.body).toEqual({ id: tenantB });
    expect(resC.body).toEqual({ id: tenantC });

    const list = await request(app).get("/api/tenants").expect(200);
    const ids = list.body.tenants.map((t: { id: string }) => t.id);
    expect(ids).toContain(tenantA);
    expect(ids).toContain(tenantB);
    expect(ids).toContain(tenantC);
  });
});
