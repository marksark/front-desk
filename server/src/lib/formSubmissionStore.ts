import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { FormSubmission, FormSubmissionCollection } from "../types";

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getSubmissionsPath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "submissions.json");
}

export async function getFormSubmissionCollection(tenantId: string): Promise<FormSubmissionCollection> {
  try {
    const raw = await readFile(getSubmissionsPath(tenantId), "utf-8");
    const data = JSON.parse(raw) as FormSubmissionCollection;
    return {
      tenantId,
      submissions: Array.isArray(data.submissions) ? data.submissions : []
    };
  } catch {
    return { tenantId, submissions: [] };
  }
}

export async function saveFormSubmission(
  tenantId: string,
  payload: { formData: Record<string, unknown> }
): Promise<FormSubmission> {
  const collection = await getFormSubmissionCollection(tenantId);
  const submission: FormSubmission = {
    id: `submission-${randomUUID()}`,
    tenantId,
    formData: payload.formData,
    submittedAt: new Date().toISOString()
  };

  if (process.env.VERCEL !== "1") {
    const tenantDir = getTenantDir(tenantId);
    await mkdir(tenantDir, { recursive: true });
    await writeFile(
      getSubmissionsPath(tenantId),
      JSON.stringify({ tenantId, submissions: [...collection.submissions, submission] }, null, 2),
      "utf-8"
    );
  }

  return submission;
}
