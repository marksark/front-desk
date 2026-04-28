import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { FormSubmission } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

async function seedTemplate(
  tenantId: string,
  jsonSchema: Record<string, unknown>,
  uiSchema: Record<string, unknown>
): Promise<void> {
  await request(app).post(`/api/form-template/${tenantId}`).send({ jsonSchema, uiSchema }).expect(201);
}

describe("/api/form-submissions", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns empty list when no submissions file", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.submissions).toEqual([]);
  });

  it("POST /:tenantId returns 404 when no form template exists", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { childsName: "Ada" } })
      .expect(404);
    expect(res.body.error).toMatch(/no published/i);
  });

  it("POST /:tenantId stores submission and GET returns it", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = {
      title: "Test Form",
      type: "object",
      required: ["childsName"],
      properties: {
        childsName: { type: "string", title: "Child's Name" }
      }
    };
    const uiSchema = { "ui:order": ["childsName"] };
    await seedTemplate(tenantId, jsonSchema, uiSchema);

    const postRes = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({
        formData: { childsName: "Jamie" },
        submitterName: "Parent Name",
        submitterEmail: "parent@example.com"
      })
      .expect(201);

    expect(postRes.body.submission).toMatchObject({
      tenantId,
      formData: { childsName: "Jamie" },
      submitterName: "Parent Name",
      submitterEmail: "parent@example.com"
    });
    expect(postRes.body.submission.id).toMatch(/^fs-/);
    expect(postRes.body.submission.submittedAt).toBeDefined();
    expect(typeof postRes.body.submission.summary).toBe("string");

    const getRes = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(getRes.body.submissions).toHaveLength(1);
    expect(getRes.body.submissions[0].formData).toEqual({ childsName: "Jamie" });

    const filePath = path.join(tenantDir(tenantId), "form-submissions.json");
    const onDisk = await readJson<{ submissions: FormSubmission[] }>(filePath);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0].id).toBe(postRes.body.submission.id);
  });

  it("POST /:tenantId returns 400 when required field missing", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = {
      type: "object",
      required: ["childsName"],
      properties: { childsName: { type: "string" } }
    };
    await seedTemplate(tenantId, jsonSchema, { "ui:order": ["childsName"] });

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: {} })
      .expect(400);
    expect(res.body.error).toMatch(/required field missing/i);
  });

  it("POST /:tenantId returns 400 when formData has unknown keys", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = {
      type: "object",
      properties: { a: { type: "string" } }
    };
    await seedTemplate(tenantId, jsonSchema, { "ui:order": ["a"] });

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { a: "x", extra: 1 } })
      .expect(400);
    expect(res.body.error).toMatch(/does not match/i);
  });

  it("POST /:tenantId returns 400 when formData is not an object", async () => {
    tenantId = await makeTestTenant();
    await seedTemplate(tenantId, { type: "object", properties: {} }, { "ui:order": [] });

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: [] })
      .expect(400);
    expect(res.body.error).toMatch(/formData must be an object/i);
  });
});
