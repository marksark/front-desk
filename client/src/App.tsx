import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { ChatPage } from "./pages/ChatPage";
import LandingPage from "./pages/LandingPage";
import { OperatorPage } from "./pages/OperatorPage";

const TENANT_ID = "sunshine-academy";
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;
const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
const HANDBOOK_STATUS_ENDPOINT = `${API_BASE_URL}/api/handbook/${TENANT_ID}/status`;
const HANDBOOK_UPLOAD_ENDPOINT = `${API_BASE_URL}/api/handbook/upload`;
const HANDBOOK_DELETE_ENDPOINT = `${API_BASE_URL}/api/handbook/${TENANT_ID}`;
const LOGS_ENDPOINT = `${API_BASE_URL}/api/logs/${TENANT_ID}`;
const STARTER_QUESTIONS = [
  "What are your hours?",
  "What's the sick child policy?",
  "How do I schedule a tour?"
];

interface ChatApiResponse {
  answer: string;
  wasUncertain: boolean;
}

interface HandbookStatusResponse {
  exists: boolean;
  tenantId: string;
  charCount?: number;
}

interface HandbookUploadResponse {
  success: boolean;
  tenantId: string;
  charCount: number;
}

interface LogEntry {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  timestamp: string;
  wasUncertain: boolean;
}

interface LogsApiResponse {
  tenantId: string;
  logs: LogEntry[];
}

type MessageRole = "user" | "assistant";
type OperatorTab = "handbook" | "questionLog";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  wasUncertain?: boolean;
}

function truncateAnswer(answer: string): string {
  if (answer.length <= 80) {
    return answer;
  }

  return `${answer.slice(0, 80)}...`;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<OperatorTab>("handbook");
  const [handbookStatus, setHandbookStatus] = useState<HandbookStatusResponse | null>(null);
  const [selectedHandbookFile, setSelectedHandbookFile] = useState<File | null>(null);
  const [handbookError, setHandbookError] = useState<string | null>(null);
  const [handbookNotice, setHandbookNotice] = useState<string | null>(null);
  const [isHandbookLoading, setIsHandbookLoading] = useState(false);
  const [isHandbookSaving, setIsHandbookSaving] = useState(false);
  const [isHandbookRemoving, setIsHandbookRemoving] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const routePath = useMemo(() => window.location.pathname, []);
  const isLandingRoute = routePath === "/";
  const isChatRoute = routePath === "/chat";
  const isOperatorRoute = routePath === "/operator";
  const persistentNavTarget = isOperatorRoute
    ? { href: "/chat", label: "Go to Parent Chat" }
    : { href: "/operator", label: "Go to Operator Dashboard" };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
    try {
      const payload = (await response.json()) as { error?: string };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error;
      }
    } catch {
      return fallback;
    }

    return fallback;
  };

  const loadHandbookStatus = useCallback(async () => {
    setIsHandbookLoading(true);
    setHandbookError(null);

    try {
      const response = await fetch(HANDBOOK_STATUS_ENDPOINT);
      if (!response.ok) {
        throw new Error("Unable to load handbook status.");
      }

      const status = (await response.json()) as HandbookStatusResponse;
      setHandbookStatus(status);
    } catch {
      setHandbookError("Could not load handbook status.");
    } finally {
      setIsHandbookLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setIsLogsLoading(true);
    setLogsError(null);

    try {
      const response = await fetch(LOGS_ENDPOINT);
      if (!response.ok) {
        throw new Error("Unable to load logs.");
      }

      const payload = (await response.json()) as LogsApiResponse;
      const sortedLogs = [...payload.logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(sortedLogs);
    } catch {
      setLogsError("Could not load question logs.");
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOperatorRoute) {
      return;
    }

    void loadHandbookStatus();
    void loadLogs();
  }, [isOperatorRoute, loadHandbookStatus, loadLogs]);

  const uploadHandbookFile = async (file: File): Promise<HandbookUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenantId", TENANT_ID);

    const uploadResponse = await fetch(HANDBOOK_UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData
    });

    if (!uploadResponse.ok) {
      const message = await readErrorMessage(uploadResponse, "Failed to upload handbook.");
      throw new Error(message);
    }

    return (await uploadResponse.json()) as HandbookUploadResponse;
  };

  const handleHandbookUpload = async () => {
    if (!selectedHandbookFile || isHandbookSaving || isHandbookRemoving) {
      return;
    }

    setIsHandbookSaving(true);
    setHandbookError(null);
    setHandbookNotice(null);

    try {
      const result = await uploadHandbookFile(selectedHandbookFile);
      setHandbookNotice(`✅ Handbook loaded — ${result.charCount} characters`);
      setSelectedHandbookFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      await loadHandbookStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload handbook.";
      setHandbookError(message);
    } finally {
      setIsHandbookSaving(false);
    }
  };

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedHandbookFile(file);
  };

  const handleReplaceSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isHandbookSaving || isHandbookRemoving) {
      return;
    }

    setIsHandbookSaving(true);
    setHandbookError(null);
    setHandbookNotice(null);

    try {
      const deleteResponse = await fetch(HANDBOOK_DELETE_ENDPOINT, {
        method: "DELETE"
      });

      if (!deleteResponse.ok) {
        const message = await readErrorMessage(deleteResponse, "Failed to remove old handbook.");
        throw new Error(message);
      }

      const uploadResult = await uploadHandbookFile(file);
      setHandbookNotice(`✅ Handbook loaded — ${uploadResult.charCount} characters`);
      await loadHandbookStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to replace handbook.";
      setHandbookError(message);
    } finally {
      setIsHandbookSaving(false);
    }
  };

  const handleRemoveHandbook = async () => {
    if (isHandbookSaving || isHandbookRemoving) {
      return;
    }

    setIsHandbookRemoving(true);
    setHandbookError(null);
    setHandbookNotice(null);

    try {
      const response = await fetch(HANDBOOK_DELETE_ENDPOINT, {
        method: "DELETE"
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to remove handbook.");
        throw new Error(message);
      }

      setSelectedHandbookFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      setHandbookStatus({ exists: false, tenantId: TENANT_ID });
      setHandbookNotice("Handbook removed.");
      await loadHandbookStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove handbook.";
      setHandbookError(message);
    } finally {
      setIsHandbookRemoving(false);
    }
  };

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsLoading(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          tenantId: TENANT_ID
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as ChatApiResponse;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        wasUncertain: data.wasUncertain
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const fallbackMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "I couldn't get a response right now. Please try again in a moment."
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendQuestion(draft);
  };

  if (isOperatorRoute) {
    return (
      <OperatorPage
        tenantId={TENANT_ID}
        activeTab={activeTab}
        handbookStatus={handbookStatus}
        selectedHandbookFile={selectedHandbookFile}
        handbookError={handbookError}
        handbookNotice={handbookNotice}
        isHandbookLoading={isHandbookLoading}
        isHandbookSaving={isHandbookSaving}
        isHandbookRemoving={isHandbookRemoving}
        logs={logs}
        logsError={logsError}
        isLogsLoading={isLogsLoading}
        uploadInputRef={uploadInputRef}
        replaceInputRef={replaceInputRef}
        persistentNavTarget={persistentNavTarget}
        truncateAnswer={truncateAnswer}
        onSetActiveTab={setActiveTab}
        onUploadFileChange={handleUploadFileChange}
        onHandbookUpload={handleHandbookUpload}
        onReplaceSelection={handleReplaceSelection}
        onRemoveHandbook={handleRemoveHandbook}
      />
    );
  }

  if (isLandingRoute) {
    return <LandingPage />;
  }

  if (!isChatRoute) {
    return (
      <div className="route-fallback">
        <p>This app has screens at /chat and /operator.</p>
        <div className="route-links">
          <a href="/chat">Go to parent chat</a>
          <a href="/operator">Go to operator dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <ChatPage
      messages={messages}
      isLoading={isLoading}
      starterQuestions={STARTER_QUESTIONS}
      draft={draft}
      endRef={endRef}
      persistentNavTarget={persistentNavTarget}
      onDraftChange={(event) => setDraft(event.target.value)}
      onSendQuestion={sendQuestion}
      onSubmit={handleSubmit}
    />
  );
}

export default App;
