import { afterEach, describe, expect, it } from "vitest";
import {
  deleteHandbook,
  getHandbookStatus,
  getHandbookText,
  saveHandbook
} from "../src/lib/handbookStore";
import { cleanupTenant, makeTestTenant } from "./_helpers";

describe("handbookStore", () => {
  let tenantId: string | undefined;

  afterEach(async () => {
    await cleanupTenant(tenantId);
    tenantId = undefined;
  });

  describe("saveHandbook + getHandbookText", () => {
    it("strips boilerplate before PROGRAM OVERVIEW", async () => {
      tenantId = await makeTestTenant();
      const raw = "Cover page line\nLegal disclaimer\n\nPROGRAM OVERVIEW\nReal content here.";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).not.toBeNull();
      expect(stored!.startsWith("PROGRAM OVERVIEW")).toBe(true);
      expect(stored!).not.toContain("Cover page line");
      expect(stored!).not.toContain("Legal disclaimer");
    });

    it("keeps the original text when PROGRAM OVERVIEW is missing", async () => {
      tenantId = await makeTestTenant();
      const raw = "Some unstructured handbook with no marker.\nMore content.";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("Some unstructured handbook");
    });

    it("collapses runs of whitespace and tabs into single spaces", async () => {
      tenantId = await makeTestTenant();
      const raw = "PROGRAM OVERVIEW\nHours:\t\t9am   to\t\t5pm";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("Hours: 9am to 5pm");
    });

    it("collapses 3+ blank lines into a single blank line", async () => {
      tenantId = await makeTestTenant();
      const raw = "PROGRAM OVERVIEW\nSection A.\n\n\n\n\nSection B.";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("Section A.\n\nSection B.");
      expect(stored).not.toMatch(/\n{3,}/);
    });

    it("repairs hyphenated line-break splits", async () => {
      tenantId = await makeTestTenant();
      const raw = "PROGRAM OVERVIEW\nenroll-\nment information here.";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("enrollment information here.");
    });

    it("normalizes form-feed and bullet markers", async () => {
      tenantId = await makeTestTenant();
      const raw = "PROGRAM OVERVIEW\fNext page\n  • Bullet one\n  - Bullet two";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("\nNext page");
      expect(stored).toContain("- Bullet one");
      expect(stored).toContain("- Bullet two");
    });

    it("deduplicates immediate consecutive duplicate words (PDF artifact)", async () => {
      tenantId = await makeTestTenant();
      const raw = "PROGRAM OVERVIEW\nThe the school opens at 9am.";

      await saveHandbook(tenantId, raw);
      const stored = await getHandbookText(tenantId);

      expect(stored).toContain("The school opens at 9am.");
      expect(stored).not.toMatch(/\bthe the\b/i);
    });

    it("overwrites existing handbook on re-save", async () => {
      tenantId = await makeTestTenant();
      await saveHandbook(tenantId, "PROGRAM OVERVIEW\nVersion one.");
      await saveHandbook(tenantId, "PROGRAM OVERVIEW\nVersion two.");

      const stored = await getHandbookText(tenantId);
      expect(stored).toContain("Version two.");
      expect(stored).not.toContain("Version one.");
    });
  });

  describe("getHandbookText", () => {
    it("returns null when no handbook has been saved", async () => {
      tenantId = await makeTestTenant();
      const stored = await getHandbookText(tenantId);
      expect(stored).toBeNull();
    });
  });

  describe("getHandbookStatus", () => {
    it("returns exists:false with no charCount when missing", async () => {
      tenantId = await makeTestTenant();
      const status = await getHandbookStatus(tenantId);
      expect(status).toEqual({ exists: false, tenantId });
    });

    it("returns exists:true with charCount equal to stored length", async () => {
      tenantId = await makeTestTenant();
      await saveHandbook(tenantId, "PROGRAM OVERVIEW\nABC.");
      const stored = await getHandbookText(tenantId);
      const status = await getHandbookStatus(tenantId);

      expect(status.exists).toBe(true);
      expect(status.tenantId).toBe(tenantId);
      expect(status.charCount).toBe(stored!.length);
    });
  });

  describe("deleteHandbook", () => {
    it("removes a saved handbook", async () => {
      tenantId = await makeTestTenant();
      await saveHandbook(tenantId, "PROGRAM OVERVIEW\nDelete me.");
      await deleteHandbook(tenantId);
      expect(await getHandbookText(tenantId)).toBeNull();
    });

    it("is a no-op when no handbook exists", async () => {
      tenantId = await makeTestTenant();
      await expect(deleteHandbook(tenantId)).resolves.toBeUndefined();
    });
  });
});
