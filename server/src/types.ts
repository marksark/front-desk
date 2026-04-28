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

export interface FormTemplate {
  tenantId: string;
  jsonSchema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}
