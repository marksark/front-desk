import { constants } from "fs";
import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { FormTemplate } from "../types";

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getFormTemplatePath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "form-template.json");
}

export async function formTemplateExists(tenantId: string): Promise<boolean> {
  const filePath = getFormTemplatePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getFormTemplate(tenantId: string): Promise<FormTemplate | null> {
  const filePath = getFormTemplatePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return null;
  }

  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as FormTemplate;
}

export async function saveFormTemplate(
  tenantId: string,
  payload: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> }
): Promise<FormTemplate> {
  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });

  const template: FormTemplate = {
    tenantId,
    jsonSchema: payload.jsonSchema,
    uiSchema: payload.uiSchema,
    updatedAt: new Date().toISOString()
  };

  await writeFile(getFormTemplatePath(tenantId), JSON.stringify(template, null, 2), "utf-8");
  return template;
}

export async function deleteFormTemplate(tenantId: string): Promise<void> {
  const filePath = getFormTemplatePath(tenantId);
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return;
  }

  await rm(filePath);
}
