import { randomUUID } from "crypto";
import { Router } from "express";
import { getFormTemplate } from "../lib/formTemplateStore";
import { appendFormSubmission, readFormSubmissions } from "../lib/formSubmissionStore";
import type { FormSubmission } from "../types";

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripHtmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Reject if submitted payload has keys that are not defined on the school template schema.
 * Prevents arbitrary data from being posted under a tenant.
 */
function validateFormDataAgainstTemplate(
  formData: Record<string, unknown>,
  templateProperties: Record<string, unknown> | undefined
): { ok: true } | { ok: false; error: string } {
  if (!templateProperties) {
    if (Object.keys(formData).length > 0) {
      return { ok: false, error: "Form data does not match the published template." };
    }
    return { ok: true };
  }
  for (const key of Object.keys(formData)) {
    if (!(key in templateProperties)) {
      return { ok: false, error: "Form data does not match the published template." };
    }
  }
  return { ok: true };
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const list = await readFormSubmissions(tenantId);
  const sorted = [...list].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  return res.json({ tenantId, submissions: sorted });
});

router.post("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const body = req.body as {
    formData?: unknown;
    submitterName?: unknown;
    submitterEmail?: unknown;
  };

  if (!isPlainObject(body.formData)) {
    return res.status(400).json({ error: "formData must be an object." });
  }

  if (
    body.submitterName !== undefined &&
    body.submitterName !== null &&
    typeof body.submitterName !== "string"
  ) {
    return res.status(400).json({ error: "submitterName must be a string when provided." });
  }

  if (
    body.submitterEmail !== undefined &&
    body.submitterEmail !== null &&
    typeof body.submitterEmail !== "string"
  ) {
    return res.status(400).json({ error: "submitterEmail must be a string when provided." });
  }

  const template = await getFormTemplate(tenantId);
  if (template === null) {
    return res.status(404).json({ error: "No published intake form for this school." });
  }

  const jsonSchema = template.jsonSchema as {
    properties?: Record<string, unknown>;
    type?: string;
  };

  if (jsonSchema.type !== "object" || !isPlainObject(jsonSchema)) {
    return res.status(500).json({ error: "Intake form configuration is invalid." });
  }

  const templateCheck = validateFormDataAgainstTemplate(
    body.formData,
    jsonSchema.properties
  );
  if (!templateCheck.ok) {
    return res.status(400).json({ error: templateCheck.error });
  }

  const required = Array.isArray(
    (jsonSchema as { required?: string[] }).required
  )
    ? (jsonSchema as { required: string[] }).required
    : [];
  for (const field of required) {
    const value = body.formData[field];
    if (value === undefined || value === null) {
      return res.status(400).json({ error: `Required field missing: ${field}` });
    }
    if (typeof value === "string" && value.trim() === "") {
      return res.status(400).json({ error: `Required field missing: ${field}` });
    }
  }

  const titleRaw = typeof jsonSchema.title === "string" ? jsonSchema.title : "Intake form";
  const descriptionRaw =
    typeof jsonSchema.description === "string" ? jsonSchema.description : undefined;

  const submission: FormSubmission = {
    id: `fs-${randomUUID()}`,
    tenantId,
    formData: body.formData,
    submittedAt: new Date().toISOString()
  };

  if (typeof body.submitterName === "string" && body.submitterName.trim().length > 0) {
    submission.submitterName = body.submitterName.trim();
  }
  if (typeof body.submitterEmail === "string" && body.submitterEmail.trim().length > 0) {
    submission.submitterEmail = body.submitterEmail.trim();
  }

  await appendFormSubmission(tenantId, submission);

  const summary = stripHtmlToText(
    [titleRaw, descriptionRaw].filter(Boolean).join(" — ") || "Intake submission"
  );

  return res.status(201).json({
    submission: {
      ...submission,
      summary: summary.length > 200 ? `${summary.slice(0, 200)}...` : summary
    }
  });
});

export default router;
