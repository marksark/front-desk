import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { FormSubmission } from "../types";

interface TenantSubmissionsFile {
  tenantId: string;
  submissions: FormSubmission[];
}

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getSubmissionsFilePath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "form-submissions.json");
}

async function readTenantSubmissions(tenantId: string): Promise<TenantSubmissionsFile> {
  const filePath = getSubmissionsFilePath(tenantId);

  try {
    const fileContent = await readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as TenantSubmissionsFile;
  } catch {
    return { tenantId, submissions: [] };
  }
}

async function writeTenantSubmissions(tenantId: string, data: TenantSubmissionsFile): Promise<void> {
  if (process.env.VERCEL === "1") {
    return;
  }

  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });
  await writeFile(getSubmissionsFilePath(tenantId), JSON.stringify(data, null, 2), "utf-8");
}

export async function listFormSubmissions(tenantId: string): Promise<FormSubmission[]> {
  const data = await readTenantSubmissions(tenantId);
  return [...data.submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function appendFormSubmission(
  tenantId: string,
  payload: { data: Record<string, unknown> }
): Promise<FormSubmission> {
  const data = await readTenantSubmissions(tenantId);
  const submission: FormSubmission = {
    id: randomUUID(),
    tenantId,
    data: payload.data,
    submittedAt: new Date().toISOString()
  };
  data.submissions.push(submission);
  await writeTenantSubmissions(tenantId, data);
  return submission;
}
