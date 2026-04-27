import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/index";
import type { FormTemplate } from "../src/types";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";

describe("/api/form-template", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
  });

  it("GET /:tenantId returns 404 when no template", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app).get(`/api/form-template/${tenantId}`).expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("POST /:tenantId creates template and writes file", async () => {
    tenantId = await makeTestTenant();
    const jsonSchema = { type: "object", properties: { name: { type: "string" } } };
    const uiSchema = { name: { "ui:widget": "text" } };

    const res = await request(app)
      .post(`/api/form-template/${tenantId}`)
      .send({ jsonSchema, uiSchema })
      .expect(201);

    expect(res.body.template).toMatchObject({
      tenantId,
      jsonSchema,
      uiSchema
    });
    expect(res.body.template.updatedAt).toBeDefined();

    const filePath = path.join(tenantDir(tenantId), "form-template.json");
    const onDisk = await readJson<FormTemplate>(filePath);
    expect(onDisk.tenantId).toBe(tenantId);
    expect(onDisk.jsonSchema).toEqual(jsonSchema);
    expect(onDisk.uiSchema).toEqual(uiSchema);
  });

  it("POST /:tenantId returns 400 when schemas are not objects", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .post(`/api/form-template/${tenantId}`)
      .send({ jsonSchema: [], uiSchema: {} })
      .expect(400);
    expect(res.body.error).toMatch(/must be objects/i);
  });

  it("POST /:tenantId returns 409 when template already exists", async () => {
    tenantId = await makeTestTenant();
    const payload = { jsonSchema: { a: 1 }, uiSchema: { b: 2 } };

    await request(app).post(`/api/form-template/${tenantId}`).send(payload).expect(201);
    const res = await request(app).post(`/api/form-template/${tenantId}`).send(payload).expect(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("PATCH /:tenantId updates existing template", async () => {
    tenantId = await makeTestTenant();
    await request(app)
      .post(`/api/form-template/${tenantId}`)
      .send({ jsonSchema: { v: 1 }, uiSchema: { x: 1 } })
      .expect(201);

    const next = { jsonSchema: { v: 2 }, uiSchema: { x: 2 } };
    const res = await request(app).patch(`/api/form-template/${tenantId}`).send(next).expect(200);
    expect(res.body.template.jsonSchema).toEqual(next.jsonSchema);
    expect(res.body.template.uiSchema).toEqual(next.uiSchema);

    const filePath = path.join(tenantDir(tenantId), "form-template.json");
    const onDisk = await readJson<FormTemplate>(filePath);
    expect(onDisk.jsonSchema).toEqual(next.jsonSchema);
  });

  it("PATCH /:tenantId returns 404 when template missing", async () => {
    tenantId = await makeTestTenant();
    const res = await request(app)
      .patch(`/api/form-template/${tenantId}`)
      .send({ jsonSchema: { a: 1 }, uiSchema: { b: 1 } })
      .expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
