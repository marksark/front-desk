import { randomUUID } from "crypto";
import { Router } from "express";
import OpenAI from "openai";
import { getHandbookText } from "../lib/handbookStore";
import { appendLog } from "./logs";
import type { LogEntry } from "../types";

interface ChatRequestBody {
  question: string;
  tenantId: string;
}

const router = Router();

const UNCERTAIN_RESPONSE =
  "I'm not sure about that — please contact the front desk directly for the most accurate information.";

router.post("/", async (req, res) => {
  const body = req.body as Partial<ChatRequestBody>;

  if (typeof body.question !== "string" || typeof body.tenantId !== "string") {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const question = body.question.trim();
  const tenantId = body.tenantId.trim();

  if (question.length === 0 || tenantId.length === 0) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const handbookText = await getHandbookText(tenantId);
  if (handbookText === null) {
    return res.status(400).json({ error: "No handbook uploaded for this school yet." });
  }

  const systemPrompt = `You are a friendly and trustworthy AI front desk assistant for an
early education center. Your job is to answer questions from parents
clearly and accurately.

RULES:
- Answer ONLY using the handbook text provided below.
  Do not use outside knowledge.
- Be warm, brief, and direct. Parents are busy and on mobile.
- If the answer is not clearly in the handbook, respond with exactly:
  "${UNCERTAIN_RESPONSE}"
- Never guess. Never make up policies. Never extrapolate beyond
  what is written.
- If the question is sensitive (health, safety, legal), always
  recommend confirming with staff directly.

HANDBOOK:
${handbookText}`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let answer: string;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    });

    const content = response.choices[0]?.message?.content;
    answer = typeof content === "string" ? content : UNCERTAIN_RESPONSE;
  } catch {
    return res.status(500).json({ error: "Failed to get a response. Please try again." });
  }

  const normalizedAnswer = answer.toLowerCase();
  const wasUncertain =
    normalizedAnswer.includes("not sure") || normalizedAnswer.includes("contact the front desk");

  const logEntry: LogEntry = {
    id: randomUUID(),
    tenantId,
    question,
    answer,
    timestamp: new Date().toISOString(),
    wasUncertain
  };

  await appendLog(tenantId, logEntry);

  return res.json({ answer, wasUncertain });
});

export default router;
