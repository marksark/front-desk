import { Router } from "express";
import multer from "multer";
import { deleteHandbook, getHandbookStatus, saveHandbook } from "../lib/handbookStore";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// needed to import pdf-parse dynamically to avoid build errors on vercel only; wouldn't do this otherwise...
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text;
}

const WORD_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

router.post("/upload", upload.single("file"), async (req, res) => {
  const tenantId = req.body.tenantId as string | undefined;
  const file = req.file;

  if (!tenantId || !file) {
    return res.status(400).json({ error: "Both tenantId and file are required." });
  }

  const originalName = file.originalname.toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  if (originalName.endsWith(".doc") || originalName.endsWith(".docx") || WORD_MIME_TYPES.has(mimetype)) {
    return res.status(400).json({
      error: "Word documents are not supported. Please export as PDF and upload that instead."
    });
  }

  let extractedText: string;
  if (mimetype === "application/pdf") {
    extractedText = await extractTextFromPDF(file.buffer);
  } else if (mimetype === "text/plain") {
    extractedText = file.buffer.toString("utf-8");
  } else {
    return res.status(400).json({
      error: "Unsupported file type. Please upload a PDF or .txt file."
    });
  }

  await saveHandbook(tenantId, extractedText);

  return res.json({
    success: true,
    tenantId,
    charCount: extractedText.length
  });
});

router.get("/:tenantId/status", async (req, res) => {
  const { tenantId } = req.params;
  const status = await getHandbookStatus(tenantId);
  return res.json(status);
});

router.delete("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  await deleteHandbook(tenantId);
  return res.json({ success: true });
});

export default router;
