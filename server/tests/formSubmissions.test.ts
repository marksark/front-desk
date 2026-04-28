import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { FormSubmissionEntry } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir, unsetVercelFlag } from "./_helpers";

describe("/api/form-submissions", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
    unsetVercelFlag();
  });

  async function seedTemplate(id: string): Promise<void> {
    const jsonSchema = { type: "object", title: "T", properties: { name: { type: "string" } } };
    const uiSchema = { name: { "ui:widget": "text" } };
    await request(app).post(`/api/form-template/${id}`).send({ jsonSchema, uiSchema }).expect(201);
  }

  it("GET /:tenantId returns 404 when no form template", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("GET /:tenantId returns empty submissions when template exists", async () => {
    tenantId = await makeTestTenant();
    await seedTemplate(tenantId);
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.submissions).toEqual([]);
  });

  it("POST /:tenantId creates submission and GET lists it", async () => {
    tenantId = await makeTestTenant();
    await seedTemplate(tenantId);
    const formData = { name: "Alex" };
    const postRes = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData })
      .expect(201);
    expect(postRes.body.submission).toMatchObject({
      tenantId,
      formData
    });
    expect(postRes.body.submission.id).toBeDefined();
    expect(postRes.body.submission.submittedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "form-submissions.json");
    const onDisk = await readJson<{ submissions: FormSubmissionEntry[] }>(filePath);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0].formData).toEqual(formData);

    const getRes = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(getRes.body.submissions).toHaveLength(1);
    expect(getRes.body.submissions[0].formData).toEqual(formData);
  });

  it("POST /:tenantId returns 400 when formData is missing or not an object", async () => {
    tenantId = await makeTestTenant();
    await seedTemplate(tenantId);
    const r1 = await request(app).post(`/api/form-submissions/${tenantId}`).send({}).expect(400);
    expect(r1.body.error).toMatch(/formData/i);
    const r2 = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: [] })
      .expect(400);
    expect(r2.body.error).toMatch(/formData/i);
  });

  it("POST /:tenantId returns 404 when no template", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { a: 1 } })
      .expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("POST /:tenantId returns 403 on Vercel", async () => {
    tenantId = await makeTestTenant();
    await seedTemplate(tenantId);
    process.env.VERCEL = "1";
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { x: 1 } })
      .expect(403);
    expect(res.body.error).toMatch(/disabled/i);
  });
});
