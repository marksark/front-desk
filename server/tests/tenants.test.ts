import { randomUUID } from "crypto";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { cleanupTenant } from "./_helpers";

describe("/api/tenants", () => {
  let createdTenantId: string | undefined;

  afterEach(async () => {
    if (createdTenantId) {
      await cleanupTenant(createdTenantId);
      createdTenantId = undefined;
    }
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
    createdTenantId = tenantId;

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
    createdTenantId = tenantId;

    await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    const res = await request(app).post("/api/tenants").send({ tenantId }).expect(409);
    expect(res.body).toHaveProperty("error");
    expect(String(res.body.error)).toMatch(/already exists/i);
  });
});
