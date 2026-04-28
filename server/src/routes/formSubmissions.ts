import { Router } from "express";
import { getFormTemplate } from "../lib/formTemplateStore";
import { getFormSubmissionCollection, saveFormSubmission } from "../lib/formSubmissionStore";

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const collection = await getFormSubmissionCollection(tenantId);
  return res.json(collection);
});

router.post("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const body = req.body as { formData?: unknown };

  if (!isPlainObject(body.formData)) {
    return res.status(400).json({ error: "formData must be an object." });
  }

  const template = await getFormTemplate(tenantId);
  if (template === null) {
    return res.status(404).json({ error: "Form template not found." });
  }

  const submission = await saveFormSubmission(tenantId, {
    formData: body.formData
  });

  return res.status(201).json({ submission });
});

export default router;
