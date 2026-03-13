import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Router } from "express";
import type { LogEntry } from "../types";

interface TenantLogsFile {
  tenantId: string;
  logs: LogEntry[];
}

interface LogPostBody {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  wasUncertain: boolean;
}

const router = Router();

function getTenantDir(tenantId: string): string {
  return path.resolve(__dirname, "../../data/tenants", tenantId);
}

function getLogsFilePath(tenantId: string): string {
  return path.join(getTenantDir(tenantId), "logs.json");
}

async function readTenantLogs(tenantId: string): Promise<TenantLogsFile> {
  const logsPath = getLogsFilePath(tenantId);

  try {
    const fileContent = await readFile(logsPath, "utf-8");
    return JSON.parse(fileContent) as TenantLogsFile;
  } catch {
    return { tenantId, logs: [] };
  }
}

async function writeTenantLogs(tenantId: string, data: TenantLogsFile): Promise<void> {
  if (process.env.VERCEL === "1") {
    return;
  }

  const tenantDir = getTenantDir(tenantId);
  await mkdir(tenantDir, { recursive: true });
  await writeFile(getLogsFilePath(tenantId), JSON.stringify(data, null, 2), "utf-8");
}

export async function appendLog(tenantId: string, logEntry: LogEntry): Promise<void> {
  const logsData = await readTenantLogs(tenantId);
  logsData.logs.push(logEntry);
  await writeTenantLogs(tenantId, logsData);
}

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const logsData = await readTenantLogs(tenantId);
  return res.json(logsData);
});

router.post("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const body = req.body as Partial<LogPostBody>;

  if (
    typeof body.id !== "string" ||
    typeof body.question !== "string" ||
    typeof body.answer !== "string" ||
    typeof body.timestamp !== "string" ||
    typeof body.wasUncertain !== "boolean"
  ) {
    return res.status(400).json({ error: "Invalid log entry payload." });
  }

  const logEntry: LogEntry = {
    id: body.id,
    tenantId,
    question: body.question,
    answer: body.answer,
    timestamp: body.timestamp,
    wasUncertain: body.wasUncertain
  };

  await appendLog(tenantId, logEntry);

  return res.status(201).json(logEntry);
});

export default router;
