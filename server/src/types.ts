export interface LogEntry {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  timestamp: string;
  wasUncertain: boolean;
}

export interface HandbookStatus {
  exists: boolean;
  tenantId: string;
  charCount?: number;
}
