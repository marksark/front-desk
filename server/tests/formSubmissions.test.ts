import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { FormSubmissionCollection } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

describe("/api/form-submissions", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns an empty submissions list when none exist", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);

    expect(res.body).toEqual({ tenantId, submissions: [] });
  });

  it("POST /:tenantId stores a form submission and writes it to disk", async () => {
    tenantId = await makeTestTenant();
    const formData = { childName: "Avery", parentEmail: "parent@example.com" };
    await request(app)
      .post(`/api/form-template/${tenantId}`)
      .send({ jsonSchema: { type: "object", properties: {} }, uiSchema: {} })
      .expect(201);

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData })
      .expect(201);

    expect(res.body.submission).toMatchObject({
      tenantId,
      formData
    });
    expect(res.body.submission.id).toMatch(/^submission-/);
    expect(res.body.submission.submittedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "submissions.json");
    const onDisk = await readJson<FormSubmissionCollection>(filePath);
    expect(onDisk.tenantId).toBe(tenantId);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0].formData).toEqual(formData);
  });

  it("POST /:tenantId returns 400 when formData is not an object", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: [] })
      .expect(400);

    expect(res.body.error).toMatch(/formData must be an object/i);
  });

  it("POST /:tenantId returns 404 when no form template exists", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { childName: "Avery" } })
      .expect(404);

    expect(res.body.error).toMatch(/template not found/i);
  });
});
