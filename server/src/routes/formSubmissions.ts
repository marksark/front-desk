import { Router } from "express";
import { formTemplateExists } from "../lib/formTemplateStore";
import { addFormSubmission, getFormSubmissions } from "../lib/formSubmissionsStore";

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  if (!(await formTemplateExists(tenantId))) {
    return res.status(404).json({ error: "Form template not found." });
  }
  const submissions = await getFormSubmissions(tenantId);
  return res.json({ tenantId, submissions });
});

router.post("/:tenantId", async (req, res) => {
  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Form submissions are disabled in the hosted demo."
    });
  }

  const { tenantId } = req.params;
  if (!(await formTemplateExists(tenantId))) {
    return res.status(404).json({ error: "Form template not found." });
  }

  const body = req.body as { formData?: unknown };
  if (!isPlainObject(body.formData)) {
    return res.status(400).json({ error: "formData must be a JSON object." });
  }

  const submission = await addFormSubmission(tenantId, body.formData);
  return res.status(201).json({ submission });
});

export default router;
