import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const TENANT_ID = "sunshine-academy";
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;
const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
const STARTER_QUESTIONS = [
  "What are your hours?",
  "What's the sick child policy?",
  "How do I schedule a tour?"
];

interface ChatApiResponse {
  answer: string;
  wasUncertain: boolean;
}

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  wasUncertain?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const isChatRoute = useMemo(() => window.location.pathname === "/chat", []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

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

  if (!isChatRoute) {
    return (
      <div className="route-fallback">
        <p>This screen is available at /chat.</p>
        <a href="/chat">Go to parent chat</a>
      </div>
    );
  }

  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <h1>
            Sunshine Academy <span aria-hidden="true">🏫</span>
          </h1>
        </header>

        <div className="chat-thread" aria-live="polite">
          {messages.length === 0 && !isLoading ? (
            <div className="starter-wrap">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="starter-chip"
                  onClick={() => void sendQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
            >
              <div className="message-bubble">{message.content}</div>
              {message.role === "assistant" && message.wasUncertain ? (
                <p className="uncertain-note">
                  ⚠️ For sensitive questions, please contact the front desk directly.
                </p>
              ) : null}
            </article>
          ))}

          {isLoading ? (
            <article className="message-row assistant">
              <div className="message-bubble typing-indicator" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            </article>
          ) : null}

          <div ref={endRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <label htmlFor="question-input" className="sr-only">
            Ask a question
          </label>
          <input
            id="question-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || draft.trim().length === 0}>
            Send
          </button>
        </form>
      </section>
    </main>
  );
}

export default App;
