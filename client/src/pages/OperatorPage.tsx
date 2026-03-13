import { ChangeEvent, ChangeEventHandler, RefObject } from "react";

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

interface PersistentNavTarget {
  href: string;
  label: string;
}

interface OperatorPageProps {
  tenantId: string;
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

  return (
    <>
      <main className="operator-page">
        <section className="operator-shell">
          <header className="operator-header">
            <h1>Operator Dashboard</h1>
            <p>Tenant: {tenantId}</p>
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
          </div>

          <section className="operator-panel">
            {activeTab === "handbook" ? (
              <div className="operator-section">
                <h2>Handbook</h2>
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
                    <p>✅ Handbook loaded — {handbookCharCount} characters</p>
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
          </section>
        </section>
      </main>
      <a className="persistent-nav-button" href={persistentNavTarget.href}>
        {persistentNavTarget.label}
      </a>
    </>
  );
}
