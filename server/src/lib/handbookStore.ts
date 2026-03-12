import { constants } from "fs";
import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { HandbookStatus } from "../types";

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getHandbookPath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "handbook.txt");
}

function compressText(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/\f/g, "\n")
    .replace(/^\s*[-•]\s*/gm, "- ")
    .replace(/\b(\w+)( \1\b)+/gi, "$1")
    .trim();
}

function removeBoilerplate(text: string): string {
  const contentStart = text.indexOf("PROGRAM OVERVIEW");
  return contentStart > -1 ? text.slice(contentStart) : text;
}

export async function saveHandbook(tenantId: string, text: string): Promise<void> {
  const tenantDir = getTenantDir(tenantId);
  const cleaned = compressText(removeBoilerplate(text));
  await mkdir(tenantDir, { recursive: true });
  await writeFile(getHandbookPath(tenantId), cleaned, "utf-8");
}

export async function getHandbookText(tenantId: string): Promise<string | null> {
  const handbookPath = getHandbookPath(tenantId);
  try {
    await access(handbookPath, constants.F_OK);
  } catch {
    return null;
  }

  return readFile(handbookPath, "utf-8");
}

export async function deleteHandbook(tenantId: string): Promise<void> {
  const handbookPath = getHandbookPath(tenantId);
  try {
    await access(handbookPath, constants.F_OK);
  } catch {
    return;
  }

  await rm(handbookPath);
}

export async function getHandbookStatus(tenantId: string): Promise<HandbookStatus> {
  const handbookText = await getHandbookText(tenantId);
  if (handbookText === null) {
    return {
      exists: false,
      tenantId,
    };
  }

  return {
    exists: true,
    tenantId,
    charCount: handbookText.length,
  };
}
