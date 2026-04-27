import { randomUUID } from "crypto";
import { constants } from "fs";
import { access, rm } from "fs/promises";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { cleanupTenant, tenantDir } from "./_helpers";

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

  it.each([
    ["empty", ""],
    ["uppercase", "MyTenant"],
    ["with underscore", "my_tenant"],
    ["with dot", "my.tenant"],
    ["with space", "my tenant"],
    ["leading hyphen", "-tenant"],
    ["too long (65 chars)", "a".repeat(65)],
    ["non-string number", 123],
    ["non-string null", null]
  ])("POST / returns 400 for invalid tenant id: %s", async (_label, tenantIdValue) => {
    const res = await request(app)
      .post("/api/tenants")
      .send({ tenantId: tenantIdValue })
      .expect(400);
    expect(String(res.body.error)).toMatch(/invalid tenant id/i);
  });

  it("POST / accepts an id at the maximum length (64 chars)", async () => {
    const base = `test-${randomUUID()}`;
    const tenantId = `${base}${"a".repeat(64 - base.length)}`;
    try {
      await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    } finally {
      await rm(tenantDir(tenantId), { recursive: true, force: true });
    }
  });

  it("POST / returns 409 when tenant already exists", async () => {
    const tenantId = `test-${randomUUID()}`;
    createdTenantId = tenantId;

    await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    const res = await request(app).post("/api/tenants").send({ tenantId }).expect(409);
    expect(res.body).toHaveProperty("error");
    expect(String(res.body.error)).toMatch(/already exists/i);
  });

  it("POST / actually creates the tenant directory on disk", async () => {
    const tenantId = `test-${randomUUID()}`;
    createdTenantId = tenantId;

    await request(app).post("/api/tenants").send({ tenantId }).expect(201);
    await expect(access(tenantDir(tenantId), constants.F_OK)).resolves.toBeUndefined();
  });

  it("POST / returns 403 in hosted demo (VERCEL=1) and does not create the directory", async () => {
    const tenantId = `test-${randomUUID()}`;
    process.env.VERCEL = "1";

    const res = await request(app).post("/api/tenants").send({ tenantId }).expect(403);
    expect(String(res.body.error)).toMatch(/disabled in the hosted demo/i);

    await expect(access(tenantDir(tenantId), constants.F_OK)).rejects.toThrow();
  });

  it("POST / trims surrounding whitespace from a valid tenant id", async () => {
    const tenantId = `test-${randomUUID()}`;
    createdTenantId = tenantId;

    await request(app)
      .post("/api/tenants")
      .send({ tenantId: `  ${tenantId}  ` })
      .expect(201);
  });
});
