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

  it("GET /:tenantId returns empty when no file", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    expect(res.body).toEqual({ tenantId, submissions: [] });
  });

  it("POST /:tenantId creates submission and persists to disk", async () => {
    tenantId = await makeTestTenant();
    const data = { childsName: "Test Child" };

    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ data })
      .expect(201);

    expect(res.body.submission).toMatchObject({
      tenantId,
      data
    });
    expect(res.body.submission.id).toBeDefined();
    expect(res.body.submission.submittedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "form-submissions.json");
    const onDisk = await readJson<TenantSubmissionsFile>(filePath);
    expect(onDisk.submissions).toHaveLength(1);
    expect(onDisk.submissions[0]).toMatchObject({ tenantId, data });
  });

  it("GET /:tenantId returns newest submissions first", async () => {
    tenantId = await makeTestTenant();
    await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ data: { n: 1 } })
      .expect(201);
    await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ data: { n: 2 } })
      .expect(201);

    const res = await request(app).get(`/api/form-submissions/${tenantId}`).expect(200);
    const nums = res.body.submissions.map((s: FormSubmission) => (s.data as { n: number }).n);
    expect(nums[0] >= nums[1]).toBe(true);
  });

  it("POST /:tenantId returns 400 when data is not an object", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-submissions/${tenantId}`)
      .send({ data: [] })
      .expect(400);
    expect(res.body.error).toMatch(/"data" object/i);
  });
});
