import { randomUUID } from "crypto";
import { constants } from "fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { FormSubmission } from "../types";

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getSubmissionsFilePath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "form-submissions.json");
}

interface SubmissionsFile {
  tenantId: string;
  submissions: FormSubmission[];
}

async function readSubmissionsFile(tenantId: string): Promise<SubmissionsFile> {
  const filePath = getSubmissionsFilePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return { tenantId, submissions: [] };
  }

  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as SubmissionsFile;
}

async function writeSubmissionsFile(tenantId: string, data: SubmissionsFile): Promise<void> {
  if (process.env.VERCEL === "1") {
    return;
  }

  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });
  await writeFile(getSubmissionsFilePath(tenantId), JSON.stringify(data, null, 2), "utf-8");
}

export async function getFormSubmissions(tenantId: string): Promise<FormSubmission[]> {
  const data = await readSubmissionsFile(tenantId);
  return [...data.submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function addFormSubmission(
  tenantId: string,
  formData: Record<string, unknown>
): Promise<FormSubmission> {
  const data = await readSubmissionsFile(tenantId);
  const submission: FormSubmission = {
    id: randomUUID(),
    tenantId,
    formData,
    submittedAt: new Date().toISOString()
  };
  data.submissions.push(submission);
  await writeSubmissionsFile(tenantId, data);
  return submission;
}
