import { constants } from "fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

export async function readFormSubmissions(tenantId: string): Promise<FormSubmission[]> {
  const filePath = getSubmissionsFilePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return [];
  }
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as TenantSubmissionsFile;
  if (!Array.isArray(data.submissions)) {
    return [];
  }
  return data.submissions;
}

async function writeSubmissionsFile(
  tenantId: string,
  submissions: FormSubmission[]
): Promise<void> {
  if (process.env.VERCEL === "1") {
    return;
  }
  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });
  const payload: TenantSubmissionsFile = { tenantId, submissions };
  await writeFile(
    getSubmissionsFilePath(tenantId),
    JSON.stringify(payload, null, 2),
    "utf-8"
  );
}

export async function appendFormSubmission(
  tenantId: string,
  entry: FormSubmission
): Promise<void> {
  const existing = await readFormSubmissions(tenantId);
  existing.push(entry);
  await writeSubmissionsFile(tenantId, existing);
}
