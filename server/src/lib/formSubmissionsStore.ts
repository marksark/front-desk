import { constants } from "fs";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { FormSubmissionEntry } from "../types";
import { formTemplateExists } from "./formTemplateStore";

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getSubmissionsFilePath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "form-submissions.json");
}

interface TenantSubmissionsFile {
  tenantId: string;
  submissions: FormSubmissionEntry[];
}

async function readSubmissionsFile(tenantId: string): Promise<TenantSubmissionsFile> {
  const filePath = getSubmissionsFilePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return { tenantId, submissions: [] };
  }

  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as TenantSubmissionsFile;
}

async function writeSubmissionsFile(tenantId: string, data: TenantSubmissionsFile): Promise<void> {
  if (process.env.VERCEL === "1") {
    return;
  }

  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });
  await writeFile(getSubmissionsFilePath(tenantId), JSON.stringify(data, null, 2), "utf-8");
}

export async function listFormSubmissions(tenantId: string): Promise<FormSubmissionEntry[]> {
  const data = await readSubmissionsFile(tenantId);
  return [...data.submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function appendFormSubmission(
  tenantId: string,
  formData: Record<string, unknown>
): Promise<FormSubmissionEntry | null> {
  if (!(await formTemplateExists(tenantId))) {
    return null;
  }

  if (!isPlainObject(formData)) {
    return null;
  }

  const entry: FormSubmissionEntry = {
    id: randomUUID(),
    tenantId,
    submittedAt: new Date().toISOString(),
    formData
  };

  const data = await readSubmissionsFile(tenantId);
  data.submissions.push(entry);
  await writeSubmissionsFile(tenantId, data);
  return entry;
}
