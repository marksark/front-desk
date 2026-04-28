import { Router } from "express";
import {
  formTemplateExists,
  getFormTemplate,
  saveFormTemplate
} from "../lib/formTemplateStore";
import { isPlainObject } from "../lib/isPlainObject";

const router = Router();

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const template = await getFormTemplate(tenantId);

  if (template === null) {
    return res.status(404).json({ error: "Form template not found." });
  }

  return res.json({ template });
});

router.post("/:tenantId", async (req, res) => {
  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Saving form templates is disabled in the hosted demo."
    });
  }

  const { tenantId } = req.params;
  const body = req.body as { jsonSchema?: unknown; uiSchema?: unknown };

  if (!isPlainObject(body.jsonSchema) || !isPlainObject(body.uiSchema)) {
    return res.status(400).json({ error: "Both jsonSchema and uiSchema must be objects." });
  }

  if (await formTemplateExists(tenantId)) {
    return res.status(409).json({ error: "Form template already exists. Use PATCH to update." });
  }

  const template = await saveFormTemplate(tenantId, {
    jsonSchema: body.jsonSchema,
    uiSchema: body.uiSchema
  });

  return res.status(201).json({ template });
});

router.patch("/:tenantId", async (req, res) => {
  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Saving form templates is disabled in the hosted demo."
    });
  }

  const { tenantId } = req.params;
  const body = req.body as { jsonSchema?: unknown; uiSchema?: unknown };

  if (!isPlainObject(body.jsonSchema) || !isPlainObject(body.uiSchema)) {
    return res.status(400).json({ error: "Both jsonSchema and uiSchema must be objects." });
  }

  if (!(await formTemplateExists(tenantId))) {
    return res.status(404).json({ error: "Form template not found." });
  }

  const template = await saveFormTemplate(tenantId, {
    jsonSchema: body.jsonSchema,
    uiSchema: body.uiSchema
  });

  return res.json({ template });
});

export default router;
