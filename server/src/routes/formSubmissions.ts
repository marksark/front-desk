import { Router } from "express";
import { getFormTemplate } from "../lib/formTemplateStore";
import { getFormSubmissionCollection, saveFormSubmission } from "../lib/formSubmissionStore";
import { isPlainObject } from "../lib/isPlainObject";

const router = Router();

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const collection = await getFormSubmissionCollection(tenantId);
  return res.json(collection);
});

router.post("/:tenantId", async (req, res) => {
  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Saving form submissions is disabled in the hosted demo."
    });
  }

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
