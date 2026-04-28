import { randomUUID } from "crypto";
import { Router } from "express";
import { formTemplateExists } from "../lib/formTemplateStore";
import { appendSubmission, readTenantSubmissions } from "../lib/formSubmissionStore";
import type { FormSubmission } from "../types";

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const data = await readTenantSubmissions(tenantId);
  return res.json(data);
});

router.post("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const body = req.body as { formData?: unknown };

  if (!isPlainObject(body.formData)) {
    return res.status(400).json({ error: "formData must be a JSON object." });
  }

  if (!(await formTemplateExists(tenantId))) {
    return res.status(404).json({ error: "No intake form is published for this school." });
  }

  const submission: FormSubmission = {
    id: randomUUID(),
    tenantId,
    submittedAt: new Date().toISOString(),
    formData: body.formData
  };

  await appendSubmission(tenantId, submission);

  return res.status(201).json({ submission });
});

export default router;
