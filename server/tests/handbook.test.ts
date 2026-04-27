import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { getHandbookText } from "../src/lib/handbookStore";
import { cleanupTenant, makeTestTenant } from "./_helpers";

const mockGetText = vi.fn();

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: mockGetText
  }))
}));

describe("/api/handbook", () => {
  let tenantId!: string;

  afterEach(async () => {
    await cleanupTenant(tenantId);
    mockGetText.mockReset();
  });

  it("POST /upload accepts .txt and persists handbook", async () => {
    tenantId = await makeTestTenant();
    const body = "PROGRAM OVERVIEW\nHello from handbook test.";

    const res = await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from(body, "utf-8"), { filename: "handbook.txt", contentType: "text/plain" })
      .expect(200);

    expect(res.body).toMatchObject({ success: true, tenantId });
    expect(typeof res.body.charCount).toBe("number");
    expect(res.body.charCount).toBeGreaterThan(0);

    const stored = await getHandbookText(tenantId);
    expect(stored).not.toBeNull();
    expect(stored!).toContain("Hello from handbook test.");
  });

  it("POST /upload accepts PDF and uses pdf-parse", async () => {
    tenantId = await makeTestTenant();
    mockGetText.mockResolvedValue({ text: "PROGRAM OVERVIEW\nParsed PDF content." });

    const res = await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("%PDF-1.4 minimal"), {
        filename: "handbook.pdf",
        contentType: "application/pdf"
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockGetText).toHaveBeenCalled();
    const stored = await getHandbookText(tenantId);
    expect(stored).not.toBeNull();
    expect(stored!).toContain("Parsed PDF content.");
  });

  it("POST /upload rejects Word documents", async () => {
    tenantId = await makeTestTenant();

    const res = await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("fake docx"), {
        filename: "handbook.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
      .expect(400);

    expect(res.body.error).toMatch(/word documents are not supported/i);
  });

  it("POST /upload returns 400 when tenantId or file is missing", async () => {
    tenantId = await makeTestTenant();

    const res = await request(app).post("/api/handbook/upload").field("tenantId", tenantId).expect(400);
    expect(res.body.error).toMatch(/both tenantid and file are required/i);
  });

  it("GET /:tenantId/status reflects missing and existing handbook", async () => {
    tenantId = await makeTestTenant();

    const before = await request(app).get(`/api/handbook/${tenantId}/status`).expect(200);
    expect(before.body).toMatchObject({ exists: false, tenantId });

    await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("PROGRAM OVERVIEW\nStatus check.", "utf-8"), {
        filename: "h.txt",
        contentType: "text/plain"
      })
      .expect(200);

    const after = await request(app).get(`/api/handbook/${tenantId}/status`).expect(200);
    expect(after.body).toMatchObject({ exists: true, tenantId });
    expect(typeof after.body.charCount).toBe("number");
  });

  it("DELETE /:tenantId is idempotent", async () => {
    tenantId = await makeTestTenant();
    await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("PROGRAM OVERVIEW\nTo delete.", "utf-8"), {
        filename: "h.txt",
        contentType: "text/plain"
      })
      .expect(200);

    await request(app).delete(`/api/handbook/${tenantId}`).expect(200);
    expect(await getHandbookText(tenantId)).toBeNull();

    await request(app).delete(`/api/handbook/${tenantId}`).expect(200);
  });

  it("POST /upload rejects legacy .doc files by extension", async () => {
    tenantId = await makeTestTenant();

    const res = await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("fake doc"), {
        filename: "handbook.doc",
        contentType: "application/octet-stream"
      })
      .expect(400);

    expect(res.body.error).toMatch(/word documents are not supported/i);
  });

  it("POST /upload rejects unsupported MIME types (e.g. images)", async () => {
    tenantId = await makeTestTenant();

    const res = await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "photo.jpg",
        contentType: "image/jpeg"
      })
      .expect(400);

    expect(res.body.error).toMatch(/unsupported file type/i);
    expect(await getHandbookText(tenantId)).toBeNull();
  });

  it("POST /upload returns 400 when tenantId is missing", async () => {
    tenantId = await makeTestTenant();

    const res = await request(app)
      .post("/api/handbook/upload")
      .attach("file", Buffer.from("PROGRAM OVERVIEW\nNo tenant.", "utf-8"), {
        filename: "h.txt",
        contentType: "text/plain"
      })
      .expect(400);

    expect(res.body.error).toMatch(/both tenantid and file are required/i);
  });

  it("POST /upload propagates a 500 when pdf-parse throws", async () => {
    tenantId = await makeTestTenant();
    mockGetText.mockRejectedValue(new Error("corrupt PDF"));

    await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("%PDF-1.4 broken"), {
        filename: "h.pdf",
        contentType: "application/pdf"
      })
      .expect(500);

    expect(await getHandbookText(tenantId)).toBeNull();
  });

  it("GET /:tenantId/status returns charCount equal to stored handbook length", async () => {
    tenantId = await makeTestTenant();
    await request(app)
      .post("/api/handbook/upload")
      .field("tenantId", tenantId)
      .attach("file", Buffer.from("PROGRAM OVERVIEW\nABCDE.", "utf-8"), {
        filename: "h.txt",
        contentType: "text/plain"
      })
      .expect(200);

    const stored = await getHandbookText(tenantId);
    const res = await request(app).get(`/api/handbook/${tenantId}/status`).expect(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.charCount).toBe(stored!.length);
  });
});
