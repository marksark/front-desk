import { ChangeEvent, ChangeEventHandler, FormEvent, RefObject, useState } from "react";
import type { Tenant } from "../tenant/TenantContext";

type OperatorTab = "handbook" | "questionLog" | "formSubmissions";

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

interface FormSubmissionEntry {
  id: string;
  tenantId: string;
  data: Record<string, unknown>;
  submittedAt: string;
}

interface PersistentNavTarget {
  href: string;
  label: string;
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
  formSubmissions: FormSubmissionEntry[];
  formSubmissionsError: string | null;
  isFormSubmissionsLoading: boolean;
  uploadInputRef: RefObject<HTMLInputElement | null>;
  replaceInputRef: RefObject<HTMLInputElement | null>;
  persistentNavTarget: PersistentNavTarget;
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
  formSubmissions,
  formSubmissionsError,
  isFormSubmissionsLoading,
  uploadInputRef,
  replaceInputRef,
  persistentNavTarget,
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
    <>
      <main className="operator-page">
        <section className="operator-shell">
          <header className="operator-header">
            <h1>Operator Dashboard</h1>
            <div className="operator-tenant-controls">
              <label className="operator-tenant-label">
                <span>Tenant:</span>
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
            {tenantsError ? <p className="operator-error">{tenantsError}</p> : null}
            {addTenantError ? <p className="operator-error">{addTenantError}</p> : null}
            <p>
              <a href="/form">Open public form intake (parents)</a>
              {" · "}
              <a href="/admin/form-builder">Open Intake Form Builder</a>
            </p>
          </header>

          <div className="operator-tabs" role="tablist" aria-label="Operator tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "handbook"}
              className={`operator-tab ${activeTab === "handbook" ? "active" : ""}`}
              onClick={() => onSetActiveTab("handbook")}
            >
              Handbook
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "questionLog"}
              className={`operator-tab ${activeTab === "questionLog" ? "active" : ""}`}
              onClick={() => onSetActiveTab("questionLog")}
            >
              Question Log
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "formSubmissions"}
              className={`operator-tab ${activeTab === "formSubmissions" ? "active" : ""}`}
              onClick={() => onSetActiveTab("formSubmissions")}
            >
              Form Intake
            </button>
          </div>

          <section className="operator-panel">
            {activeTab === "handbook" ? (
              <div className="operator-section">
                <h2>Handbook</h2>
                <h5><strong> Uploads are disabled in the hosted demo. Run locally to manage your handbook. </strong></h5>
                {isHandbookLoading ? <p>Loading handbook status...</p> : null}
                {handbookError ? <p className="operator-error">{handbookError}</p> : null}
                {handbookNotice ? <p className="operator-success">{handbookNotice}</p> : null}

                {!isHandbookLoading && !handbookExists ? (
                  <div className="handbook-actions">
                    <p>No handbook uploaded yet.</p>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      onChange={onUploadFileChange}
                      disabled={isHandbookSaving || isHandbookRemoving}
                    />
                    <button
                      type="button"
                      onClick={() => void onHandbookUpload()}
                      disabled={!selectedHandbookFile || isHandbookSaving || isHandbookRemoving}
                    >
                      {isHandbookSaving ? "Uploading..." : "Upload Handbook"}
                    </button>
                  </div>
                ) : null}

                {!isHandbookLoading && handbookExists ? (
                  <div className="handbook-actions">
                    <p>Handbook loaded — {handbookCharCount} characters</p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        onClick={() => replaceInputRef.current?.click()}
                        disabled={isHandbookSaving || isHandbookRemoving}
                      >
                        {isHandbookSaving ? "Replacing..." : "Replace Handbook"}
                      </button>
                      <button
                        type="button"
                        className="danger"
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
                <h2>Question Log</h2>
                {isLogsLoading ? <p>Loading logs...</p> : null}
                {logsError ? <p className="operator-error">{logsError}</p> : null}
                {!isLogsLoading && !logsError && logs.length === 0 ? <p>No questions asked yet.</p> : null}

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
                            <td>{log.wasUncertain ? "⚠️ Uncertain" : "✅ Answered"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "formSubmissions" ? (
              <div className="operator-section">
                <h2>Form Intake</h2>
                <h5>
                  <strong> Submissions are read-only. Run the app locally to collect new responses. </strong>
                </h5>
                {isFormSubmissionsLoading ? <p>Loading form submissions...</p> : null}
                {formSubmissionsError ? (
                  <p className="operator-error">{formSubmissionsError}</p>
                ) : null}
                {!isFormSubmissionsLoading && !formSubmissionsError && formSubmissions.length === 0 ? (
                  <p>No form submissions yet.</p>
                ) : null}
                {!isFormSubmissionsLoading && !formSubmissionsError && formSubmissions.length > 0 ? (
                  <div className="logs-table-wrap">
                    <table className="logs-table" aria-label="Form submissions">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Submitted data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formSubmissions.map((row) => (
                          <tr key={row.id}>
                            <td>{new Date(row.submittedAt).toLocaleString()}</td>
                            <td>
                              <code className="form-submission-json">
                                {truncateAnswer(JSON.stringify(row.data))}
                              </code>
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
      </main >
      <a className="persistent-nav-button" href={persistentNavTarget.href}>
        {persistentNavTarget.label}
      </a>
    </>
  );
}
