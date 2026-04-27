import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteFormTemplate,
  formTemplateExists,
  getFormTemplate,
  saveFormTemplate
} from "../src/lib/formTemplateStore";
import { cleanupTenant, makeTestTenant, readJson, tenantDir } from "./_helpers";
import type { FormTemplate } from "../src/types";

describe("formTemplateStore", () => {
  let tenantId: string | undefined;

  afterEach(async () => {
    await cleanupTenant(tenantId);
    tenantId = undefined;
  });

  describe("formTemplateExists", () => {
    it("returns false when no template has been saved", async () => {
      tenantId = await makeTestTenant();
      expect(await formTemplateExists(tenantId)).toBe(false);
    });

    it("returns true after saveFormTemplate", async () => {
      tenantId = await makeTestTenant();
      await saveFormTemplate(tenantId, { jsonSchema: { a: 1 }, uiSchema: { b: 2 } });
      expect(await formTemplateExists(tenantId)).toBe(true);
    });
  });

  describe("getFormTemplate", () => {
    it("returns null when no template exists", async () => {
      tenantId = await makeTestTenant();
      expect(await getFormTemplate(tenantId)).toBeNull();
    });

    it("returns the template that was saved (round-trip)", async () => {
      tenantId = await makeTestTenant();
      const jsonSchema = { type: "object", properties: { name: { type: "string" } } };
      const uiSchema = { name: { "ui:widget": "text" } };

      await saveFormTemplate(tenantId, { jsonSchema, uiSchema });
      const stored = await getFormTemplate(tenantId);

      expect(stored).not.toBeNull();
      expect(stored!.tenantId).toBe(tenantId);
      expect(stored!.jsonSchema).toEqual(jsonSchema);
      expect(stored!.uiSchema).toEqual(uiSchema);
    });
  });

  describe("saveFormTemplate", () => {
    it("creates the tenant directory if it does not exist", async () => {
      tenantId = await makeTestTenant();
      const template = await saveFormTemplate(tenantId, {
        jsonSchema: { x: 1 },
        uiSchema: { y: 2 }
      });

      expect(template.tenantId).toBe(tenantId);
      expect(template.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("writes the file as pretty-printed JSON to disk", async () => {
      tenantId = await makeTestTenant();
      await saveFormTemplate(tenantId, {
        jsonSchema: { type: "object" },
        uiSchema: {}
      });

      const filePath = path.join(tenantDir(tenantId), "form-template.json");
      const onDisk = await readJson<FormTemplate>(filePath);
      expect(onDisk.tenantId).toBe(tenantId);
      expect(onDisk.jsonSchema).toEqual({ type: "object" });
    });

    it("overwrites the existing template on subsequent save", async () => {
      tenantId = await makeTestTenant();
      const first = await saveFormTemplate(tenantId, {
        jsonSchema: { v: 1 },
        uiSchema: { v: 1 }
      });

      // Delay so updatedAt changes (ISO timestamps have ms resolution).
      await new Promise((resolve) => setTimeout(resolve, 5));

      const second = await saveFormTemplate(tenantId, {
        jsonSchema: { v: 2 },
        uiSchema: { v: 2 }
      });

      expect(second.jsonSchema).toEqual({ v: 2 });
      expect(second.updatedAt >= first.updatedAt).toBe(true);

      const stored = await getFormTemplate(tenantId);
      expect(stored!.jsonSchema).toEqual({ v: 2 });
    });
  });

  describe("deleteFormTemplate", () => {
    it("removes a saved template", async () => {
      tenantId = await makeTestTenant();
      await saveFormTemplate(tenantId, { jsonSchema: {}, uiSchema: {} });
      await deleteFormTemplate(tenantId);
      expect(await formTemplateExists(tenantId)).toBe(false);
    });

    it("is a no-op when no template exists", async () => {
      tenantId = await makeTestTenant();
      await expect(deleteFormTemplate(tenantId)).resolves.toBeUndefined();
    });
  });
});
