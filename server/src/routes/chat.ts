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

  // early return if request body is invalid
  if (typeof body.question !== "string" || typeof body.tenantId !== "string") {
    return res.status(400).json({ error: "Invalid request body." });
  }

  // early return if question or tenantId is empty
  const question = body.question.trim();
  const tenantId = body.tenantId.trim();

  if (question.length === 0 || tenantId.length === 0) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  // early return if no handbook uploaded for this school
  const handbookText = await getHandbookText(tenantId);
  if (handbookText === null) {
    return res.status(400).json({ error: "No handbook uploaded for this school yet." });
  }

  // system prompt is the instructions for the AI to follow when answering the question.
  const systemPrompt = `You are a friendly and trustworthy AI front desk 
  assistant for an early education center. Your job is to answer questions 
  from parents clearly and accurately.
  
  RULES:
  - Answer ONLY using the handbook text provided below.
    Do not use outside knowledge or invent policies.
  - Be warm, brief, and direct. Parents are busy and on mobile.
  
  FINDING ANSWERS:
  - Reason about the INTENT of the question, not just the exact words.
    Example: "tuition" → also look for: cost, fee, rate, price, payment, 
    monthly, enrollment fee, extended care cost.
    Example: "hours" → also look for: schedule, open, close, operation, 
    arrival, departure, extended care times.
    Example: "sick child" → also look for: illness, fever, health, 
    symptom, medication, contagious.
  - If multiple sections are relevant, synthesize them into one clear answer.
  - If the question is broad (e.g. "what are your hours"), provide ALL 
    relevant hours from the handbook and label which program each applies to.
  - Always quote or closely paraphrase the handbook — do not summarize 
    so loosely that meaning is lost.
  
  WHEN YOU DON'T KNOW:
  - If after a genuine search of the handbook the answer truly is not 
    there, respond with exactly: "${UNCERTAIN_RESPONSE}"
  - Do not use this as a shortcut. Exhaust synonyms and related 
    concepts before giving up.
  - If the question is sensitive (health, safety, legal), answer 
    from the handbook AND recommend confirming with staff directly.
  
  HANDBOOK:
  ${handbookText}`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let answer: string;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // 0.4 is a good balance between creativity and accuracy for early POC; consider increasing to 0.6-0.7 for production.
      temperature: 0.4,
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
