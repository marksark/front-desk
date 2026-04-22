import { constants } from "fs";
import { access, mkdir, readdir } from "fs/promises";
import path from "path";
import { Router } from "express";

const router = Router();

const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function getTenantsRoot(): string {
  return path.resolve(__dirname, "../../data/tenants");
}

function getTenantDir(tenantId: string): string {
  return path.join(getTenantsRoot(), tenantId);
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

router.get("/", async (_req, res) => {
  const tenantsRoot = getTenantsRoot();

  try {
    const entries = await readdir(tenantsRoot, { withFileTypes: true });
    const tenants = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ id: entry.name }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return res.json({ tenants });
  } catch {
    return res.json({ tenants: [] });
  }
});

router.post("/", async (req, res) => {
  const body = req.body as { tenantId?: unknown };
  const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";

  if (!TENANT_ID_PATTERN.test(tenantId)) {
    return res.status(400).json({
      error:
        "Invalid tenant id. Use lowercase letters, numbers, and hyphens (max 64 chars, must start with a letter or number)."
    });
  }

  if (process.env.VERCEL === "1") {
    return res.status(403).json({
      error: "Creating tenants is disabled in the hosted demo."
    });
  }

  const tenantDir = getTenantDir(tenantId);

  if (await dirExists(tenantDir)) {
    return res.status(409).json({ error: "Tenant already exists." });
  }

  await mkdir(tenantDir, { recursive: true });

  return res.status(201).json({ id: tenantId });
});

export default router;
