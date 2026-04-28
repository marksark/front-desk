import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { FormSubmission } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

interface TenantSubmissionsFile {
  tenantId: string;
  submissions: FormSubmission[];
}

describe("/api/form-submissions", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns empty list when file missing", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body).toEqual({ tenantId, submissions: [] });
  });

  it("POST /:tenantId returns 404 when no form template exists", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: { name: "Test" } })
      .expect(404);
    expect(res.body.error).toMatch(/no intake form/i);
  });

  it("POST /:tenantId creates submission when template exists", async () => {
    tenantId = await makeTestTenant();
    await request(app)
      .post(`/api/form-template/${tenantId}`)
      .send({
        jsonSchema: { type: "object", properties: { a: { type: "string" } } },
        uiSchema: {}
      })
      .expect(201);

    const formData = { a: "hello" };
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData })
      .expect(201);

    expect(res.body.submission).toMatchObject({
      tenantId,
      formData
    });
    expect(typeof res.body.submission.id).toBe("string");
    expect(res.body.submission.submittedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "form-submissions.json");
    const onDisk = await readJson<TenantSubmissionsFile>(filePath);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0].formData).toEqual(formData);
  });

  it("POST /:tenantId returns 400 when formData is not an object", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ formData: "nope" })
      .expect(400);
    expect(res.body.error).toMatch(/formData must be/i);
  });
});
