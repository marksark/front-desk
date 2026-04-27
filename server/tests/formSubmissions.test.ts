import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import { cleanupTenant, makeTestTenant, readJson, tenantDir, unsetVercelFlag } from "./_helpers";
import type { FormSubmission } from "../src/types";

interface SubmissionsFile {
  tenantId: string;
  submissions: FormSubmission[];
}

async function createTemplate(
  requestApp: typeof app,
  tenantId: string,
  jsonSchema: Record<string, unknown>,
  uiSchema: Record<string, unknown>
): Promise<void> {
  await request(requestApp)
    .post(`/api/form-template/${tenantId}`)
    .send({ jsonSchema, uiSchema })
    .expect(201);
}

describe("/api/form-submissions", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns 404 when no form template exists", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(404);
    expect(res.body.error).toMatch(/form template not found/i);
  });

  it("GET /:tenantId returns empty submissions when template exists", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = { type: "object", properties: { name: { type: "string" } } };
    const uiSchema = {};
    await createTemplate(app, tenantId, jsonSchema, uiSchema);

    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.submissions).toEqual([]);
  });

  it("POST /:tenantId stores submission and returns 201", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = { type: "object", properties: { name: { type: "string" } } };
    const uiSchema = {};
    await createTemplate(app, tenantId, jsonSchema, uiSchema);

    const formData = { name: "Jane" };
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData })
      .expect(201);

    expect(res.body.submission).toMatchObject({
      tenantId,
      formData
    });
    expect(res.body.submission.id).toBeDefined();
    expect(res.body.submission.submittedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "form-submissions.json");
    const onDisk = await readJson<SubmissionsFile>(filePath);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0].formData).toEqual(formData);
  });

  it("POST /:tenantId returns 400 when formData is not an object", async () => {
    tenantId = await makeTestTenant();
    await createTemplate(app, tenantId, { type: "object", properties: {} }, {});

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: "not-an-object" })
      .expect(400);
    expect(res.body.error).toMatch(/formData must be a JSON object/i);
  });

  it("POST /:tenantId returns 404 when template missing", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: {} })
      .expect(404);
    expect(res.body.error).toMatch(/form template not found/i);
  });

  it("POST /:tenantId returns 403 when VERCEL=1", async () => {
    tenantId = await makeTestTenant();
    await createTemplate(app, tenantId, { type: "object", properties: {} }, {});
    process.env.VERCEL = "1";
    try {
      const res = await request(app)
        .post(`/api/form-submissions/${tenantId}`)
        .send({ formData: {} })
        .expect(403);
      expect(res.body.error).toMatch(/disabled in the hosted demo/i);
    } finally {
      unsetVercelFlag();
    }
  });

  it("GET /:tenantId returns submissions newest first", async () => {
    tenantId = await makeTestTenant();
    await createTemplate(app, tenantId, { type: "object", properties: { a: { type: "string" } } }, {});

    await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { a: "first" } })
      .expect(201);
    await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { a: "second" } })
      .expect(201);

    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body.submissions).toHaveLength(2);
    const [newer, older] = res.body.submissions;
    expect(newer.formData).toEqual({ a: "second" });
    expect(older.formData).toEqual({ a: "first" });
  });
});
