import { Router } from "express";
import { appendFormSubmission, listFormSubmissions } from "../lib/formSubmissionStore";

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const submissions = await listFormSubmissions(tenantId);
  return res.json({ tenantId, submissions });
});

router.post("/:tenantId", async (req, res) => {
  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Form submissions are disabled in the hosted demo."
    });
  }

  const { tenantId } = req.params;
  const body = req.body as { data?: unknown };

  if (!isPlainObject(body.data)) {
    return res.status(400).json({ error: "Request body must include a \"data\" object." });
  }

  const submission = await appendFormSubmission(tenantId, { data: body.data });
  return res.status(201).json({ submission });
});

export default router;
