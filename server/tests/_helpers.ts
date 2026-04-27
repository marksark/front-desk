import { randomUUID } from "crypto";
import { mkdir, readFile, rm } from "fs/promises";
import path from "path";

/** Only IDs created by makeTestTenant() are allowed for cleanup. */
const TEST_TENANT_ID_RE =
  /^test-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function unsetVercelFlag(): void {
  delete process.env.VERCEL;
}

export function getTenantsRoot(): string {
  return path.resolve(__dirname, "../data/tenants");
}

export function tenantDir(tenantId: string): string {
  return path.join(getTenantsRoot(), tenantId);
}

/**
 * Creates a unique tenant directory under data/tenants.
 * Clears VERCEL so POST/PATCH writes are not blocked in routes.
 */
export async function makeTestTenant(): Promise<string> {
  unsetVercelFlag();
  const tenantId = `test-${randomUUID()}`;
  await mkdir(tenantDir(tenantId), { recursive: true });
  return tenantId;
}

/**
 * Removes the tenant directory. Only accepts IDs matching makeTestTenant() pattern
 * so real fixture tenants (e.g. sunshine-academy) cannot be deleted by mistake.
 */
export async function cleanupTenant(tenantId: string): Promise<void> {
  if (!TEST_TENANT_ID_RE.test(tenantId)) {
    throw new Error(`Refusing to cleanup non-test tenant id: ${tenantId}`);
  }
  await rm(tenantDir(tenantId), { recursive: true, force: true });
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
