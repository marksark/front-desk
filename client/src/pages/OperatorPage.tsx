import { ChangeEvent, ChangeEventHandler, FormEvent, RefObject, useState } from "react";
import type { Tenant } from "../tenant/TenantContext";
import { OperatorNav } from "./OperatorNav";

type OperatorTab = "handbook" | "questionLog";

interface HandbookStatus {
  exists: boolean;
  charCount?: number;
}

interface LogEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  wasUncertain: boolean;
}

interface OperatorPageProps {
  tenantId: string;
  tenants: Tenant[];
  isTenantsLoading: boolean;
  tenantsError: string | null;
  onTenantChange: (id: string) => void;
  onAddTenant: (id: string) => Promise<Tenant>;
  activeTab: OperatorTab;
  handbookStatus: HandbookStatus | null;
  selectedHandbookFile: File | null;
  handbookError: string | null;
  handbookNotice: string | null;
  isHandbookLoading: boolean;
  isHandbookSaving: boolean;
  isHandbookRemoving: boolean;
  logs: LogEntry[];
  logsError: string | null;
  isLogsLoading: boolean;
  uploadInputRef: RefObject<HTMLInputElement | null>;
  replaceInputRef: RefObject<HTMLInputElement | null>;
  truncateAnswer: (answer: string) => string;
  onSetActiveTab: (tab: OperatorTab) => void;
  onUploadFileChange: ChangeEventHandler<HTMLInputElement>;
  onHandbookUpload: () => Promise<void>;
  onReplaceSelection: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveHandbook: () => Promise<void>;
}

export function OperatorPage({
  tenantId,
  tenants,
  isTenantsLoading,
  tenantsError,
  onTenantChange,
  onAddTenant,
  activeTab,
  handbookStatus,
  selectedHandbookFile,
  handbookError,
  handbookNotice,
  isHandbookLoading,
  isHandbookSaving,
  isHandbookRemoving,
  logs,
  logsError,
  isLogsLoading,
  uploadInputRef,
  replaceInputRef,
  truncateAnswer,
  onSetActiveTab,
  onUploadFileChange,
  onHandbookUpload,
  onReplaceSelection,
  onRemoveHandbook
}: OperatorPageProps) {
  const handbookExists = Boolean(handbookStatus?.exists);
  const handbookCharCount = handbookStatus?.charCount ?? 0;

  const [newTenantId, setNewTenantId] = useState("");
  const [addTenantError, setAddTenantError] = useState<string | null>(null);
  const [isAddingTenant, setIsAddingTenant] = useState(false);

  const hasKnownTenant = tenants.some((tenant) => tenant.id === tenantId);
  const dropdownOptions = hasKnownTenant ? tenants : [{ id: tenantId }, ...tenants];

  const handleAddTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTenantId.trim();
    if (!trimmed || isAddingTenant) {
      return;
    }

    setIsAddingTenant(true);
    setAddTenantError(null);

    try {
      await onAddTenant(trimmed);
      setNewTenantId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create tenant.";
      setAddTenantError(message);
    } finally {
      setIsAddingTenant(false);
    }
  };

  return (
    <div className="operator-page">
      <OperatorNav activeView={activeTab} hideHandbookAndQuestionLogTabs />

      <main className="operator-main">
        <section className="operator-shell">
          <header className="operator-header">
            <div className="operator-header-row">
              <div>
                <p className="operator-eyebrow">Operator Dashboard</p>
                <h1>
                  {activeTab === "handbook" ? "Handbook" : "Question Log"}
                </h1>
                <p className="operator-subtitle">
                  {activeTab === "handbook"
                    ? "Upload and manage the handbook the AI answers from."
                    : "Review every question parents have asked and how the AI responded."}
                </p>
              </div>
              <div className="operator-tenant-controls">
                <label className="operator-tenant-label">
                  <span>Tenant</span>
                  <select
                    className="operator-tenant-select"
                    value={tenantId}
                    onChange={(event) => onTenantChange(event.target.value)}
                    disabled={isTenantsLoading}
                  >
                    {dropdownOptions.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.id}
                      </option>
                    ))}
                  </select>
                </label>
                <form className="operator-add-tenant" onSubmit={handleAddTenant}>
                  <input
                    type="text"
                    placeholder="new-tenant-id"
                    value={newTenantId}
                    onChange={(event) => setNewTenantId(event.target.value)}
                    disabled={isAddingTenant}
                    aria-label="New tenant id"
                  />
                  <button
                    type="submit"
                    disabled={isAddingTenant || newTenantId.trim().length === 0}
                  >
                    {isAddingTenant ? "Adding..." : "Add tenant"}
                  </button>
                </form>
              </div>
            </div>
            {tenantsError ? <p className="operator-error">{tenantsError}</p> : null}
            {addTenantError ? <p className="operator-error">{addTenantError}</p> : null}
          </header>

          <div className="operator-segmented" role="tablist" aria-label="Operator section">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "handbook"}
              className={`operator-segment${activeTab === "handbook" ? " active" : ""}`}
              onClick={() => onSetActiveTab("handbook")}
            >
              <span aria-hidden="true">📘</span> Handbook
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "questionLog"}
              className={`operator-segment${activeTab === "questionLog" ? " active" : ""}`}
              onClick={() => onSetActiveTab("questionLog")}
            >
              <span aria-hidden="true">📝</span> Question Log
            </button>
          </div>

          <section className="operator-panel">
            {activeTab === "handbook" ? (
              <div className="operator-section">
                <p className="operator-demo-note">
                  Uploads are disabled in the hosted demo. Run locally to manage your handbook.
                </p>
                {isHandbookLoading ? <p>Loading handbook status...</p> : null}
                {handbookError ? <p className="operator-error">{handbookError}</p> : null}
                {handbookNotice ? <p className="operator-success">{handbookNotice}</p> : null}

                {!isHandbookLoading && !handbookExists ? (
                  <div className="handbook-actions">
                    <p className="handbook-status empty">
                      <span aria-hidden="true">📂</span> No handbook uploaded yet.
                    </p>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={onUploadFileChange}
                      disabled={isHandbookSaving || isHandbookRemoving}
                    />
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void onHandbookUpload()}
                      disabled={!selectedHandbookFile || isHandbookSaving || isHandbookRemoving}
                    >
                      {isHandbookSaving ? "Uploading..." : "Upload Handbook"}
                    </button>
                  </div>
                ) : null}

                {!isHandbookLoading && handbookExists ? (
                  <div className="handbook-actions">
                    <p className="handbook-status loaded">
                      <span aria-hidden="true">✅</span> Handbook loaded — {handbookCharCount.toLocaleString()} characters
                    </p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => replaceInputRef.current?.click()}
                        disabled={isHandbookSaving || isHandbookRemoving}
                      >
                        {isHandbookSaving ? "Replacing..." : "Replace Handbook"}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void onRemoveHandbook()}
                        disabled={isHandbookSaving || isHandbookRemoving}
                      >
                        {isHandbookRemoving ? "Removing..." : "Remove Handbook"}
                      </button>
                    </div>
                    <input
                      ref={replaceInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={(event) => void onReplaceSelection(event)}
                      disabled={isHandbookSaving || isHandbookRemoving}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "questionLog" ? (
              <div className="operator-section">
                {isLogsLoading ? <p>Loading logs...</p> : null}
                {logsError ? <p className="operator-error">{logsError}</p> : null}
                {!isLogsLoading && !logsError && logs.length === 0 ? (
                  <p className="operator-empty">No questions asked yet.</p>
                ) : null}

                {!isLogsLoading && !logsError && logs.length > 0 ? (
                  <div className="logs-table-wrap">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Question</th>
                          <th>Answer</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>{log.question}</td>
                            <td>{truncateAnswer(log.answer)}</td>
                            <td>
                              <span
                                className={`status-badge${log.wasUncertain ? " uncertain" : " ok"}`}
                              >
                                {log.wasUncertain ? "⚠️ Uncertain" : "✅ Answered"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
