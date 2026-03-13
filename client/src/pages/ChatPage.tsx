import { ChangeEventHandler, FormEventHandler, RefObject } from "react";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  wasUncertain?: boolean;
}

interface PersistentNavTarget {
  href: string;
  label: string;
}

interface ChatPageProps {
  messages: Message[];
  isLoading: boolean;
  starterQuestions: string[];
  draft: string;
  endRef: RefObject<HTMLDivElement | null>;
  persistentNavTarget: PersistentNavTarget;
  onDraftChange: ChangeEventHandler<HTMLInputElement>;
  onSendQuestion: (question: string) => Promise<void>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function ChatPage({
  messages,
  isLoading,
  starterQuestions,
  draft,
  endRef,
  persistentNavTarget,
  onDraftChange,
  onSendQuestion,
  onSubmit
}: ChatPageProps) {
  return (
    <>
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
                {starterQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="starter-chip"
                    onClick={() => void onSendQuestion(question)}
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

          <form className="chat-input-bar" onSubmit={onSubmit}>
            <label htmlFor="question-input" className="sr-only">
              Ask a question
            </label>
            <input
              id="question-input"
              type="text"
              value={draft}
              onChange={onDraftChange}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || draft.trim().length === 0}>
              Send
            </button>
          </form>
        </section>
      </main>
      <a className="persistent-nav-button" href={persistentNavTarget.href}>
        {persistentNavTarget.label}
      </a>
    </>
  );
}
